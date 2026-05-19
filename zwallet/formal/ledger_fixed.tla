---- MODULE ledger ----
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Accounts, MaxAmt, MaxTx

VARIABLES ledger, balance

TypeOK ==
  /\ ledger \in Seq([tx: 1..MaxTx, acc: Accounts, amount: 1..MaxAmt, dir: {"debit","credit"}])
  /\ balance \in [Accounts -> Int]

Init ==
  /\ ledger = << >>
  /\ balance = [a \in Accounts |-> 0]

IsDebit(e) == e.dir = "debit"
IsCredit(e) == e.dir = "credit"

LedgerDelta(e) == IF IsDebit(e) THEN e.amount ELSE -e.amount

SumSeq(seq) ==
  IF Len(seq) = 0 THEN 0
  ELSE Head(seq) + SumSeq(Tail(seq))

BalanceFromLedger(a) ==
  SumSeq([
    IF e.acc = a /\ IsCredit(e) THEN e.amount
    ELSE IF e.acc = a /\ IsDebit(e) THEN -e.amount
    ELSE 0
    : e \in ledger
  ])

ZeroSum ==
  SumSeq([
    LedgerDelta(e) : e \in ledger
  ]) = 0

BalanceMatchesLedger ==
  \A a \in Accounts:
    balance[a] = BalanceFromLedger(a)

NonNegative ==
  \A a \in Accounts: balance[a] >= 0

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

Next ==
  \E tx \in 1..MaxTx,
    debit \in Accounts,
    credit \in Accounts,
    amt \in 1..MaxAmt:
      Post(tx, debit, credit, amt)

Spec == Init /\ [][Next]_<<ledger, balance>>

====