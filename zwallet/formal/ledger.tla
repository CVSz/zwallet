---- MODULE ledger ----
EXTENDS Naturals, Sequences

CONSTANTS Accounts

VARIABLES ledger, balance

(*
ledger: sequence of entries
entry == [tx, acc, amount, dir]
balance: function Accounts -> Int
*)

Init ==
  /\ ledger = << >>
  /\ balance = [a \in Accounts |-> 0]


IsDebit(e) == e.dir = "debit"
IsCredit(e) == e.dir = "credit"

Amount(e) == e.amount
Acc(e) == e.acc


(* Double-entry transaction *)
Post(tx, debitAcc, creditAcc, amt) ==
  /\ amt > 0
  /\ balance[debitAcc] >= amt
  /\ LET e1 == [tx |-> tx, acc |-> debitAcc, amount |-> amt, dir |-> "debit"]
         e2 == [tx |-> tx, acc |-> creditAcc, amount |-> amt, dir |-> "credit"]
     IN
       /\ ledger' = Append(Append(ledger, e1), e2)
       /\ balance' = [balance EXCEPT
            ![debitAcc] = @ - amt,
            ![creditAcc] = @ + amt]


Next == \E tx, a, b, amt \in Accounts, Accounts, Nat:
  Post(tx, a, b, amt)


(* ================= INVARIANTS ================= *)

ZeroSum ==
  LET total ==
    Sum({ IF IsDebit(e) THEN e.amount ELSE -e.amount : e \in SeqToSet(ledger) })
  IN total = 0

BalanceMatchesLedger ==
  \A a \in Accounts:
    balance[a] = Sum({
      IF e.acc = a /\ IsCredit(e) THEN e.amount
      ELSE IF e.acc = a /\ IsDebit(e) THEN -e.amount
      ELSE 0
      : e \in SeqToSet(ledger)
    })

NonNegative ==
  \A a \in Accounts: balance[a] >= 0


Spec == Init /\ [][Next]_<<ledger, balance>>


THEOREM Spec => []ZeroSum
THEOREM Spec => []BalanceMatchesLedger
THEOREM Spec => []NonNegative

====