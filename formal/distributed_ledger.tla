---- MODULE distributed_ledger ----
EXTENDS Naturals, Sequences

CONSTANTS Accounts, MaxAmt, MaxTx

VARIABLES ledger, balance, outbox, kafka

(* Types *)
TypeOK ==
  /\ ledger \in Seq([tx: 1..MaxTx, acc: Accounts, amount: 1..MaxAmt, dir: {"debit","credit"}])
  /\ balance \in [Accounts -> Int]
  /\ outbox \in Seq([tx: 1..MaxTx])
  /\ kafka \in Seq([tx: 1..MaxTx])

Init ==
  /\ ledger = << >>
  /\ balance = [a \in Accounts |-> 0]
  /\ outbox = << >>
  /\ kafka = << >>

IsDebit(e) == e.dir = "debit"
IsCredit(e) == e.dir = "credit"

LedgerDelta(e) == IF IsDebit(e) THEN e.amount ELSE -e.amount

SumLedger(seq) ==
  LET n == Len(seq)
  IN IF n = 0 THEN 0 ELSE Sum({LedgerDelta(seq[i]) : i \in 1..n})

BalanceFromLedger(a) ==
  LET n == Len(ledger)
  IN Sum({
    IF ledger[i].acc = a THEN LedgerDelta(ledger[i]) ELSE 0
    : i \in 1..n
  })

ZeroSum == SumLedger(ledger) = 0

BalanceMatchesLedger ==
  \A a \in Accounts:
    balance[a] = BalanceFromLedger(a)

NonNegative ==
  \A a \in Accounts: balance[a] >= 0

(* Post transaction: ledger + balance + outbox atomically *)
Post(tx, debit, credit, amt) ==
  /\ tx \in 1..MaxTx
  /\ debit \in Accounts
  /\ credit \in Accounts
  /\ debit # credit
  /\ amt \in 1..MaxAmt
  /\ balance[debit] >= amt

  /\ ledger' = Append(Append(ledger,
        [tx |-> tx, acc |-> debit, amount |-> amt, dir |-> "debit"]),
        [tx |-> tx, acc |-> credit, amount |-> amt, dir |-> "credit"])

  /\ balance' = [balance EXCEPT
        ![debit] = @ - amt,
        ![credit] = @ + amt]

  /\ outbox' = Append(outbox, tx)
  /\ kafka' = kafka

(* Worker moves outbox → kafka (at-least-once) *)
Publish ==
  /\ Len(outbox) > 0
  /\ LET tx == Head(outbox) IN
     /\ outbox' = Tail(outbox)
     /\ kafka' = Append(kafka, tx)
     /\ ledger' = ledger
     /\ balance' = balance

(* Duplicate publish allowed *)
DuplicatePublish ==
  /\ Len(kafka) > 0
  /\ kafka' = Append(kafka, kafka[Len(kafka)])
  /\ UNCHANGED <<ledger, balance, outbox>>

(* Crash / stutter *)
Stutter ==
  /\ UNCHANGED <<ledger, balance, outbox, kafka>>

Next ==
  \/ \E tx \in 1..MaxTx,
        debit \in Accounts,
        credit \in Accounts,
        amt \in 1..MaxAmt:
        Post(tx, debit, credit, amt)
  \/ Publish
  \/ DuplicatePublish
  \/ Stutter

(* Invariants *)
Invariant ==
  /\ TypeOK
  /\ ZeroSum
  /\ BalanceMatchesLedger
  /\ NonNegative

Spec == Init /\ [][Next]_<<ledger, balance, outbox, kafka>>

====