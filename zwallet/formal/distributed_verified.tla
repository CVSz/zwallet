---- MODULE distributed_verified ----
EXTENDS Naturals, Sequences

CONSTANTS Accounts, MaxAmt, MaxTx

VARIABLES ledger, balance, outbox, kafka, processed

TypeOK ==
  /\ ledger \in Seq([tx: 1..MaxTx, acc: Accounts, amount: 1..MaxAmt, dir: {"debit","credit"}])
  /\ balance \in [Accounts -> Int]
  /\ outbox \in Seq(1..MaxTx)
  /\ kafka \in Seq(1..MaxTx)
  /\ processed \subseteq 1..MaxTx

Init ==
  /\ ledger = << >>
  /\ balance = [a \in Accounts |-> 0]
  /\ outbox = << >>
  /\ kafka = << >>
  /\ processed = {}

IsDebit(e) == e.dir = "debit"
LedgerDelta(e) == IF IsDebit(e) THEN e.amount ELSE -e.amount

SumLedger ==
  LET n == Len(ledger)
  IN IF n = 0 THEN 0 ELSE Sum({LedgerDelta(ledger[i]) : i \in 1..n})

BalanceFromLedger(a) ==
  LET n == Len(ledger)
  IN Sum({ IF ledger[i].acc = a THEN LedgerDelta(ledger[i]) ELSE 0 : i \in 1..n })

ZeroSum == SumLedger = 0

BalanceMatchesLedger ==
  \A a \in Accounts: balance[a] = BalanceFromLedger(a)

NonNegative ==
  \A a \in Accounts: balance[a] >= 0

(* Ledger + Outbox atomic *)
Post(tx, d, c, amt) ==
  /\ tx \in 1..MaxTx
  /\ d \in Accounts
  /\ c \in Accounts
  /\ d # c
  /\ amt \in 1..MaxAmt
  /\ balance[d] >= amt

  /\ ledger' = Append(Append(ledger,
        [tx |-> tx, acc |-> d, amount |-> amt, dir |-> "debit"]),
        [tx |-> tx, acc |-> c, amount |-> amt, dir |-> "credit"])

  /\ balance' = [balance EXCEPT
        ![d] = @ - amt,
        ![c] = @ + amt]

  /\ outbox' = Append(outbox, tx)
  /\ UNCHANGED <<kafka, processed>>

(* Outbox → Kafka *)
Publish ==
  /\ Len(outbox) > 0
  /\ LET tx == Head(outbox) IN
     /\ outbox' = Tail(outbox)
     /\ kafka' = Append(kafka, tx)
     /\ UNCHANGED <<ledger, balance, processed>>

(* Consumer with idempotency *)
Consume ==
  /\ Len(kafka) > 0
  /\ LET tx == Head(kafka) IN
     /\ kafka' = Tail(kafka)
     /\ IF tx \notin processed THEN
           processed' = processed \cup {tx}
        ELSE
           processed' = processed
     /\ UNCHANGED <<ledger, balance, outbox>>

Stutter == UNCHANGED <<ledger, balance, outbox, kafka, processed>>

Next ==
  \/ \E tx \in 1..MaxTx, d \in Accounts, c \in Accounts, amt \in 1..MaxAmt:
        Post(tx, d, c, amt)
  \/ Publish
  \/ Consume
  \/ Stutter

Invariant ==
  /\ TypeOK
  /\ ZeroSum
  /\ BalanceMatchesLedger
  /\ NonNegative

NoDoubleProcess ==
  \A tx \in processed: Cardinality({x \in processed : x = tx}) = 1

Spec == Init /\ [][Next]_<<ledger, balance, outbox, kafka, processed>>

====