import assert from 'node:assert/strict'
import {
  formatLKR,
  parseLKRInput,
  distributeEqualShares,
  calculateMemberBalances,
  calculateTotalExpenses,
  generateSettlementSuggestions,
} from './money.ts'
import type { Member, Expense, Payment } from '../types/index.ts'

console.log('--- RUNNING SPLITTO FINANCIAL VERIFICATION SUITE ---')

// 1. Formatting & Input Parsing
assert.equal(formatLKR(150000), 'Rs. 1,500.00')
assert.equal(formatLKR(0), 'Rs. 0.00')
assert.equal(formatLKR(25), 'Rs. 0.25')
assert.equal(formatLKR(-10000), '-Rs. 100.00')

assert.equal(parseLKRInput('1500'), 150000)
assert.equal(parseLKRInput('1500.00'), 150000)
assert.equal(parseLKRInput('1,500.50'), 150050)
assert.equal(parseLKRInput('0.05'), 5)
assert.throws(() => parseLKRInput('-100'))
assert.throws(() => parseLKRInput('abc'))
assert.throws(() => parseLKRInput('10.999'))
console.log('✓ Currency formatting and parsing tests passed')

// 2. Deterministic Leftover Cent Distribution
// Rs. 100 (10,000 cents) divided among 3 members: 3,334 cents, 3,333 cents, and 3,333 cents in stable creation order
const creationOrder = ['mem-me', 'mem-niro', 'mem-arun']
const shares100 = distributeEqualShares(10000, ['mem-me', 'mem-niro', 'mem-arun'], creationOrder)

assert.equal(shares100['mem-me'], 3334)
assert.equal(shares100['mem-niro'], 3333)
assert.equal(shares100['mem-arun'], 3333)
assert.equal(
  shares100['mem-me'] + shares100['mem-niro'] + shares100['mem-arun'],
  10000,
  'Sum of shares must equal total amount exactly'
)
console.log('✓ Rs. 100 divided among three produces Rs. 33.34, Rs. 33.33, and Rs. 33.33 in stable member creation order')

// 3. Two-Person Example from Requirements
const memberMe: Member = {
  id: 'mem-me',
  name: 'Me',
  isMe: true,
  isActive: true,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

const memberNiro: Member = {
  id: 'mem-niro',
  name: 'Niro',
  isMe: false,
  isActive: true,
  createdAt: '2026-10-01T08:30:00Z',
  updatedAt: '2026-10-01T08:30:00Z',
}

const twoMembers = [memberMe, memberNiro]
const twoCreationOrder = ['mem-me', 'mem-niro']

// I pay Rs. 600 for breakfast, split equally (Rs. 300 each)
const breakfastShares = distributeEqualShares(60000, ['mem-me', 'mem-niro'], twoCreationOrder)
const expBreakfast: Expense = {
  id: 'exp-breakfast',
  description: 'Breakfast',
  amount: 60000,
  paidById: 'mem-me',
  date: '2026-10-05',
  splitMethod: 'equal',
  shares: [
    { memberId: 'mem-me', amount: breakfastShares['mem-me'] }, // 30000
    { memberId: 'mem-niro', amount: breakfastShares['mem-niro'] }, // 30000
  ],
  createdAt: '2026-10-05T08:00:00Z',
  updatedAt: '2026-10-05T08:00:00Z',
}

// Niro pays Rs. 1,000 for dinner, with my share Rs. 400 and Niro's share Rs. 600 (custom split)
const expDinner: Expense = {
  id: 'exp-dinner',
  description: 'Dinner',
  amount: 100000,
  paidById: 'mem-niro',
  date: '2026-10-05',
  splitMethod: 'custom',
  shares: [
    { memberId: 'mem-me', amount: 40000 },
    { memberId: 'mem-niro', amount: 60000 },
  ],
  createdAt: '2026-10-05T20:00:00Z',
  updatedAt: '2026-10-05T20:00:00Z',
}

const twoPersonExpenses = [expBreakfast, expDinner]

// Verify:
// Total expenses: Rs. 1,600
const totalExp = calculateTotalExpenses(twoPersonExpenses)
assert.equal(totalExp, 160000)
assert.equal(formatLKR(totalExp), 'Rs. 1,600.00')

const initialBalances = calculateMemberBalances(twoMembers, twoPersonExpenses, [])
const bMe = initialBalances.find((b) => b.memberId === 'mem-me')!
const bNiro = initialBalances.find((b) => b.memberId === 'mem-niro')!

// I paid: Rs. 600
assert.equal(bMe.expensesPaid, 60000)
// My share: Rs. 700 (300 from breakfast + 400 from dinner)
assert.equal(bMe.expenseShareOwed, 70000)
// Niro paid: Rs. 1,000
assert.equal(bNiro.expensesPaid, 100000)
// Niro's share: Rs. 900 (300 from breakfast + 600 from dinner)
assert.equal(bNiro.expenseShareOwed, 90000)

// I owe Niro Rs. 100 (net balance: -Rs. 100; Niro: +Rs. 100)
assert.equal(bMe.netBalance, -10000)
assert.equal(bNiro.netBalance, 10000)

// Sum of all net balances must be zero
assert.equal(bMe.netBalance + bNiro.netBalance, 0)

// Suggested settlement: I pay Niro Rs. 100
const suggestions1 = generateSettlementSuggestions(initialBalances)
assert.equal(suggestions1.length, 1)
assert.deepEqual(suggestions1[0], {
  fromMemberId: 'mem-me',
  fromMemberName: 'Me',
  toMemberId: 'mem-niro',
  toMemberName: 'Niro',
  amount: 10000,
})

// After I pay Niro Rs. 40, I owe Rs. 60
const payment1: Payment = {
  id: 'pay-1',
  fromMemberId: 'mem-me',
  toMemberId: 'mem-niro',
  amount: 4000,
  date: '2026-10-05',
  createdAt: '2026-10-05T21:00:00Z',
  updatedAt: '2026-10-05T21:00:00Z',
}

const balancesAfterPay1 = calculateMemberBalances(twoMembers, twoPersonExpenses, [payment1])
const bMeAfter1 = balancesAfterPay1.find((b) => b.memberId === 'mem-me')!
const bNiroAfter1 = balancesAfterPay1.find((b) => b.memberId === 'mem-niro')!
assert.equal(bMeAfter1.netBalance, -6000, 'After paying Rs. 40, I owe Rs. 60')
assert.equal(bNiroAfter1.netBalance, 6000)

// After another Rs. 60 payment, both balances are zero
const payment2: Payment = {
  id: 'pay-2',
  fromMemberId: 'mem-me',
  toMemberId: 'mem-niro',
  amount: 6000,
  date: '2026-10-05',
  createdAt: '2026-10-05T21:30:00Z',
  updatedAt: '2026-10-05T21:30:00Z',
}

const balancesAfterPay2 = calculateMemberBalances(twoMembers, twoPersonExpenses, [payment1, payment2])
const bMeAfter2 = balancesAfterPay2.find((b) => b.memberId === 'mem-me')!
const bNiroAfter2 = balancesAfterPay2.find((b) => b.memberId === 'mem-niro')!
assert.equal(bMeAfter2.netBalance, 0)
assert.equal(bNiroAfter2.netBalance, 0)

// Total expenses remain Rs. 1,600
assert.equal(calculateTotalExpenses(twoPersonExpenses), 160000)
console.log('✓ Two-person example (breakfast/dinner/payments) fully verified')

// 4. Three-Person Example from Requirements
// Members: me, Niro, Arun
const memberArun: Member = {
  id: 'mem-arun',
  name: 'Arun',
  isMe: false,
  isActive: true,
  createdAt: '2026-10-01T09:00:00Z',
  updatedAt: '2026-10-01T09:00:00Z',
}

const threeMembers = [memberMe, memberNiro, memberArun]

// I pay Rs. 900, split equally among all three (Rs. 300 each)
const expThree1: Expense = {
  id: 'exp-three-1',
  description: 'Shared Groceries',
  amount: 90000,
  paidById: 'mem-me',
  date: '2026-10-05',
  splitMethod: 'equal',
  shares: [
    { memberId: 'mem-me', amount: 30000 },
    { memberId: 'mem-niro', amount: 30000 },
    { memberId: 'mem-arun', amount: 30000 },
  ],
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
}

// Niro pays Rs. 600, split equally between Niro and Arun (Rs. 300 each, I am excluded!)
const expThree2: Expense = {
  id: 'exp-three-2',
  description: 'Taxi',
  amount: 60000,
  paidById: 'mem-niro',
  date: '2026-10-05',
  splitMethod: 'equal',
  shares: [
    { memberId: 'mem-niro', amount: 30000 },
    { memberId: 'mem-arun', amount: 30000 },
  ],
  createdAt: '2026-10-05T11:00:00Z',
  updatedAt: '2026-10-05T11:00:00Z',
}

const threePersonBalances = calculateMemberBalances(threeMembers, [expThree1, expThree2], [])
const bThreeMe = threePersonBalances.find((b) => b.memberId === 'mem-me')!
const bThreeNiro = threePersonBalances.find((b) => b.memberId === 'mem-niro')!
const bThreeArun = threePersonBalances.find((b) => b.memberId === 'mem-arun')!

// Expected:
// My balance: +Rs. 600 (paid 900, share 300)
assert.equal(bThreeMe.netBalance, 60000)
// Niro's balance: Rs. 0 (paid 600, share 300 + 300 = 600)
assert.equal(bThreeNiro.netBalance, 0)
// Arun's balance: -Rs. 600 (paid 0, share 300 + 300 = 600)
assert.equal(bThreeArun.netBalance, -60000)

// Sum of all net balances equals 0
assert.equal(bThreeMe.netBalance + bThreeNiro.netBalance + bThreeArun.netBalance, 0)

// Suggested settlement: Arun pays me Rs. 600
const suggestionsThree = generateSettlementSuggestions(threePersonBalances)
assert.equal(suggestionsThree.length, 1)
assert.deepEqual(suggestionsThree[0], {
  fromMemberId: 'mem-arun',
  fromMemberName: 'Arun',
  toMemberId: 'mem-me',
  toMemberName: 'Me',
  amount: 60000,
})
console.log('✓ Three-person example (Me, Niro, Arun) fully verified')

// 5. One-Person Expense & Payer Excluded from Split
// Example: Niro pays Rs. 500 for Arun only (e.g. bought something for Arun)
const expOnePerson: Expense = {
  id: 'exp-one',
  description: 'Arun prescription',
  amount: 50000,
  paidById: 'mem-niro',
  date: '2026-10-05',
  splitMethod: 'exact_single',
  shares: [{ memberId: 'mem-arun', amount: 50000 }],
  createdAt: '2026-10-05T12:00:00Z',
  updatedAt: '2026-10-05T12:00:00Z',
}

const balancesOnePerson = calculateMemberBalances(threeMembers, [expOnePerson], [])
assert.equal(balancesOnePerson.find((b) => b.memberId === 'mem-niro')!.netBalance, 50000)
assert.equal(balancesOnePerson.find((b) => b.memberId === 'mem-arun')!.netBalance, -50000)
assert.equal(balancesOnePerson.find((b) => b.memberId === 'mem-me')!.netBalance, 0)
// 6. Backup Validation Tests
import { validateBackupData } from './storage.ts'

const validBackupJson = JSON.stringify({
  schemaVersion: 1,
  revision: 2,
  operatorName: 'Me',
  members: [memberMe, memberNiro],
  expenses: twoPersonExpenses,
  payments: [payment1, payment2],
})

const valResult = validateBackupData(validBackupJson)
assert.equal(valResult.valid, true)
assert.equal(valResult.counts?.members, 2)
assert.equal(valResult.counts?.expenses, 2)
assert.equal(valResult.counts?.payments, 2)

// Malformed backup tests:
// Corrupted JSON
assert.equal(validateBackupData('{ corrupt json ...').valid, false)

// Missing members
assert.equal(validateBackupData(JSON.stringify({ expenses: [] })).valid, false)

// Share mismatch
const badShareJson = JSON.stringify({
  schemaVersion: 1,
  revision: 1,
  members: [memberMe, memberNiro],
  expenses: [
    {
      id: 'e1',
      description: 'Bad split',
      amount: 1000,
      paidById: 'mem-me',
      date: '2026-10-05',
      splitMethod: 'custom',
      shares: [{ memberId: 'mem-me', amount: 500 }], // sum 500 != 1000
    },
  ],
  payments: [],
})
assert.equal(validateBackupData(badShareJson).valid, false)
console.log('✓ Backup validation & rejection of malformed backups verified')

console.log('ALL FINANCIAL VERIFICATION TESTS PASSED SUCCESSFULLY!')

