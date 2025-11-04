"use client";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { usePrivateBills } from "@/hooks/usePrivateBills";
import { errorNotDeployed } from "./ErrorNotDeployed";
import { useMemo, useState } from "react";
import { EXPENSE_TAGS, INCOME_TAGS } from "@/fhevm/internal/constants";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type TabType = "dashboard" | "balance" | "monthly" | "addRecord" | "expenses" | "income";

export const PrivateBillsDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({ provider, chainId, initialMockChains, enabled: true });

  const bills = usePrivateBills({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [amount, setAmount] = useState<number>(0);
  const [isIncome, setIsIncome] = useState<boolean>(true);
  const [tag, setTag] = useState<string>(INCOME_TAGS[0]);
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const monthKey = useMemo(() => {
    if (!month || !/^[0-9]{4}-[0-9]{2}$/.test(month)) return 0;
    const [y, m] = month.split("-").map((s) => Number(s));
    return y * 100 + m;
  }, [month]);

  const currentTagOptions = useMemo(() => (isIncome ? INCOME_TAGS : EXPENSE_TAGS), [isIncome]);
  const nowTs = () => Math.floor(Date.now() / 1000);
  const [showExpenseTags, setShowExpenseTags] = useState<boolean>(false);
  const [showIncomeTags, setShowIncomeTags] = useState<boolean>(false);

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">PrivateBills</h1>
            <p className="text-2xl text-yellow-300">Secure Encrypted Accounting</p>
          </div>
          <button
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-bold text-xl px-12 py-6 rounded-2xl shadow-2xl transform transition hover:scale-105 active:scale-95"
            onClick={connect}
          >
            🔐 Connect to MetaMask
        </button>
        </div>
      </div>
    );
  }

  if (chainId !== undefined && bills.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "balance", label: "Balance", icon: "💰" },
    { id: "monthly", label: "Monthly Net", icon: "📅" },
    { id: "addRecord", label: "Add Record", icon: "➕" },
    { id: "expenses", label: "Expense Analysis", icon: "📉" },
    { id: "income", label: "Income Analysis", icon: "📈" },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl shadow-2xl p-8 mb-8 border-2 border-yellow-400">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">PrivateBills</h1>
              <p className="text-yellow-300 text-lg">Private Encrypted Accounting on FHEVM</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm mb-1">Connected Account</p>
              <p className="text-white font-mono text-sm bg-gray-700 px-4 py-2 rounded-lg">
                {ethersSigner?.address ? `${ethersSigner.address.slice(0, 6)}...${ethersSigner.address.slice(-4)}` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 mb-8 shadow-xl">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[150px] px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 shadow-lg scale-105"
                    : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span className="text-2xl mr-2">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          {activeTab === "dashboard" && <DashboardTab bills={bills} ethersSigner={ethersSigner} fhevmStatus={fhevmStatus} fhevmError={fhevmError} />}
          {activeTab === "balance" && <BalanceTab bills={bills} />}
          {activeTab === "monthly" && <MonthlyTab bills={bills} month={month} setMonth={setMonth} monthKey={monthKey} />}
          {activeTab === "addRecord" && (
            <AddRecordTab
              bills={bills}
              amount={amount}
              setAmount={setAmount}
              isIncome={isIncome}
              setIsIncome={setIsIncome}
              tag={tag}
              setTag={setTag}
              month={month}
              setMonth={setMonth}
              monthKey={monthKey}
              currentTagOptions={currentTagOptions}
              nowTs={nowTs}
            />
          )}
          {activeTab === "expenses" && (
            <ExpensesTab
              bills={bills}
              month={month}
              setMonth={setMonth}
              monthKey={monthKey}
              showExpenseTags={showExpenseTags}
              setShowExpenseTags={setShowExpenseTags}
            />
          )}
          {activeTab === "income" && (
            <IncomeTab
              bills={bills}
              month={month}
              setMonth={setMonth}
              monthKey={monthKey}
              showIncomeTags={showIncomeTags}
              setShowIncomeTags={setShowIncomeTags}
            />
          )}
        </div>

        {/* Status Message */}
        {bills.message && (
          <div className="mt-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center">
              <span className="text-3xl mr-4">💬</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Status Message</p>
                <p className="text-gray-800 font-mono">{bills.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Tab Component
function DashboardTab({ bills, ethersSigner, fhevmStatus, fhevmError }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">📊 System Overview</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <InfoCard title="Account Information" icon="👤">
          <InfoRow label="Your Address" value={ethersSigner?.address || "Not connected"} />
          <InfoRow label="Contract Address" value={bills.contractAddress || "Not deployed"} />
        </InfoCard>

        <InfoCard title="FHEVM Status" icon="🔐">
          <InfoRow label="Status" value={fhevmStatus} />
          <InfoRow label="Error" value={fhevmError || "No errors"} />
        </InfoCard>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-900 mb-3">ℹ️ Quick Guide</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• <strong>Balance:</strong> View and decrypt your total balance</li>
          <li>• <strong>Monthly Net:</strong> Check income minus expenses for any month</li>
          <li>• <strong>Add Record:</strong> Add new income or expense entries</li>
          <li>• <strong>Analysis:</strong> View detailed breakdowns by category</li>
        </ul>
      </div>
        </div>
  );
}

// Balance Tab Component
function BalanceTab({ bills }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">💰 Your Balance</h2>
      
      <InfoCard title="Balance Information" icon="💵">
        <InfoRow label="Encrypted Handle" value={bills.balanceHandle || "Not loaded"} mono />
        <InfoRow 
          label="Decrypted Balance" 
          value={bills.isBalanceDecrypted ? String(bills.balanceClear) : "Not yet decrypted"} 
          highlight={bills.isBalanceDecrypted}
        />
      </InfoCard>

      <div className="flex gap-4 flex-wrap">
        <ActionButton
          onClick={bills.refreshBalanceHandle}
          disabled={!bills.canQuery}
          icon="🔄"
        >
          Refresh Balance
        </ActionButton>
        
        <ActionButton
          onClick={bills.decryptBalanceHandle}
          disabled={!bills.canDecrypt || !bills.balanceHandle}
          icon="🔓"
          variant="primary"
        >
          {bills.isBalanceDecrypted 
            ? `Balance: ${String(bills.balanceClear)}` 
            : bills.isDecrypting 
            ? "Decrypting..." 
            : "Decrypt Balance"}
        </ActionButton>
      </div>
    </div>
  );
}

// Monthly Tab Component
function MonthlyTab({ bills, month, setMonth, monthKey }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">📅 Monthly Net Income</h2>
      
      <InfoCard title="Monthly Summary" icon="📊">
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Month</label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <InfoRow label="Encrypted Handle" value={bills.monthlyHandle || "Not loaded"} mono />
        <InfoRow 
          label="Net Income (Income - Expense)" 
          value={bills.isMonthlyDecrypted ? String(bills.monthlyClear) : "Not yet decrypted"} 
          highlight={bills.isMonthlyDecrypted}
        />
      </InfoCard>

      <div className="flex gap-4 flex-wrap">
        <ActionButton
          onClick={() => bills.refreshMonthlyExpenseHandle(monthKey)}
          disabled={!bills.canQuery || monthKey === 0}
          icon="🔄"
        >
          Refresh Monthly Net
        </ActionButton>
        
        <ActionButton
          onClick={bills.decryptMonthlyExpenseHandle}
          disabled={!bills.canDecrypt || !bills.monthlyHandle}
          icon="🔓"
          variant="primary"
        >
          {bills.isMonthlyDecrypted 
            ? `Net: ${String(bills.monthlyClear)}` 
            : bills.isDecrypting 
            ? "Decrypting..." 
            : "Decrypt Monthly Net"}
        </ActionButton>
      </div>
    </div>
  );
}

// Add Record Tab Component
function AddRecordTab({ bills, amount, setAmount, isIncome, setIsIncome, tag, setTag, month, setMonth, monthKey, currentTagOptions, nowTs }: any) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">➕ Add New Record</h2>
      
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-300">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">💵 Amount</label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900 font-semibold"
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">📝 Type</label>
            <select
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900 font-semibold"
              value={isIncome ? "income" : "expense"}
              onChange={(e) => {
                const newIsIncome = e.target.value === "income";
                setIsIncome(newIsIncome);
                setTag(newIsIncome ? INCOME_TAGS[0] : EXPENSE_TAGS[0]);
              }}
            >
              <option value="income">💰 Income</option>
              <option value="expense">💸 Expense</option>
          </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">🏷️ Category</label>
            <select
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900 font-semibold"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              {currentTagOptions.map((t: string) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">📅 Month</label>
            <input
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900 font-semibold"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6">
          <ActionButton
            onClick={() => bills.addRecord(amount, isIncome, tag, nowTs(), monthKey)}
            disabled={!bills.canAdd || amount <= 0 || monthKey === 0}
            icon="✅"
            variant="primary"
            fullWidth
          >
            {bills.isAdding ? "⏳ Submitting Transaction..." : "Add Record to Blockchain"}
          </ActionButton>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> Your transaction will be encrypted and submitted to the blockchain. 
          Please confirm the transaction in MetaMask when prompted.
        </p>
      </div>
    </div>
  );
}

// Expenses Tab Component
function ExpensesTab({ bills, month, setMonth, monthKey, showExpenseTags, setShowExpenseTags }: any) {
  const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6'];
  const expenseBreakdown = bills.getMonthlyExpenseBreakdown(EXPENSE_TAGS);
  const expenseChartData = expenseBreakdown
    .map((it: any) => ({ tag: it.tag, amount: Number(it.amount), percent: it.percent }))
    .filter((it: any) => it.amount > 0);
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">📉 Expense Analysis</h2>
      
      <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-200">
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-800 mb-2">📅 Select Month</label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <ActionButton
          onClick={() => {
            setShowExpenseTags(true);
            bills.computeExpenseTagBreakdown(monthKey, EXPENSE_TAGS);
          }}
          disabled={!bills.canDecrypt || monthKey === 0}
          icon="📊"
          variant="primary"
        >
          {bills.isDecrypting || bills.isRefreshing ? "⏳ Computing..." : "Compute Expense Breakdown"}
        </ActionButton>
      </div>

        {showExpenseTags && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">📊 Expense Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseChartData}
                  dataKey="amount"
                  nameKey="tag"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${(entry.percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {expenseChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`Amount: ${value}`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown List */}
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💸 Expense Breakdown by Category</h3>
            <div className="space-y-3">
              {expenseBreakdown.map((it: any, index: number) => (
                <div key={it.tag} className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                      />
                      <span className="font-bold text-gray-900">{it.tag}</span>
                    </div>
                    <span className="font-mono font-bold text-red-600 text-lg">{String(it.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${it.percent * 100}%`,
                        backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1 text-right">{(it.percent * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
      </div>
  );
}

// Income Tab Component
function IncomeTab({ bills, month, setMonth, monthKey, showIncomeTags, setShowIncomeTags }: any) {
  const INCOME_COLORS = ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];
  const incomeBreakdown = bills.getMonthlyIncomeBreakdown(INCOME_TAGS);
  const incomeChartData = incomeBreakdown
    .map((it: any) => ({ tag: it.tag, amount: Number(it.amount), percent: it.percent }))
    .filter((it: any) => it.amount > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">📈 Income Analysis</h2>
      
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-800 mb-2">📅 Select Month</label>
          <input
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-yellow-400 focus:outline-none text-gray-900"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <ActionButton
          onClick={() => {
            setShowIncomeTags(true);
            bills.computeIncomeTagBreakdown(monthKey, INCOME_TAGS);
          }}
          disabled={!bills.canDecrypt || monthKey === 0}
          icon="📊"
          variant="primary"
        >
          {bills.isDecrypting || bills.isRefreshing ? "⏳ Computing..." : "Compute Income Breakdown"}
        </ActionButton>
      </div>

      {showIncomeTags && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">📊 Income Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeChartData}
                  dataKey="amount"
                  nameKey="tag"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry: any) => `${(entry.percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {incomeChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-i-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`Amount: ${value}`, '']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown List */}
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Income Breakdown by Category</h3>
            <div className="space-y-3">
              {incomeBreakdown.map((it: any, index: number) => (
                <div key={it.tag} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length] }}
                      />
                      <span className="font-bold text-gray-900">{it.tag}</span>
                    </div>
                    <span className="font-mono font-bold text-green-600 text-lg">{String(it.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${it.percent * 100}%`,
                        backgroundColor: INCOME_COLORS[index % INCOME_COLORS.length]
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-1 text-right">{(it.percent * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Components
function InfoCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        <span className="text-2xl mr-2">{icon}</span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false, highlight = false }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
    return (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
      <span className="text-sm font-semibold text-gray-700">{label}:</span>
      <span className={`text-sm ${mono ? "font-mono" : ""} ${highlight ? "text-green-600 font-bold" : "text-gray-900"} break-all max-w-[60%] text-right`}>
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  children,
  variant = "default",
  fullWidth = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon?: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
  fullWidth?: boolean;
}) {
  const baseClass = "px-6 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  const variantClass = variant === "primary"
    ? "bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 hover:shadow-xl transform hover:scale-105 active:scale-95"
    : "bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white hover:shadow-xl transform hover:scale-105 active:scale-95";
  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClass} ${variantClass} ${widthClass}`}>
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
}
