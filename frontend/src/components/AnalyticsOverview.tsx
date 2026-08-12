import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";

const COLORS = [
  "#4f46e5",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#64748b",
];

type OverviewData = {
  currentBalance: number;
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  spendingByCategory: { category: string; total: number; count: number }[];
  monthlyTrend: { year: number; month: number; income: number; expenses: number }[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AnalyticsOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/v1/analytics/overview");
        setData(response.data);
      } catch {
        setError("Could not load analytics");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-md p-8 text-center text-slate-500">
        Loading analytics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mt-8 bg-white rounded-xl shadow-md p-8 text-center text-red-500">
        {error || "Analytics unavailable"}
      </div>
    );
  }

  const trendData = data.monthlyTrend.map((row) => ({
    name: `${MONTHS[row.month - 1]} ${row.year}`,
    Income: row.income,
    Expenses: row.expenses,
  }));

  return (
    <div className="mt-8 space-y-6">
      <h2 className="font-bold text-lg">Financial Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Current Balance" value={data.currentBalance} tone="indigo" />
        <StatCard label="Total Income (this month)" value={data.totalIncome} tone="green" />
        <StatCard label="Total Expenses (this month)" value={data.totalExpenses} tone="red" />
        <StatCard
          label="Transactions (this month)"
          value={data.transactionCount}
          tone="slate"
          isCount
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
          <h3 className="font-semibold mb-4">Spending by Category</h3>
          {data.spendingByCategory.length === 0 ? (
            <p className="text-slate-500 text-sm py-10 text-center">
              No expenses this month yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.spendingByCategory}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ category }) => category}
                  >
                    {data.spendingByCategory.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value ?? 0).toLocaleString("en-IN")}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
          <h3 className="font-semibold mb-4">Income vs Expenses</h3>
          {trendData.length === 0 ? (
            <p className="text-slate-500 text-sm py-10 text-center">
              Not enough history for a trend chart yet.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value ?? 0).toLocaleString("en-IN")}`
                    }
                  />
                  <Legend />
                  <Bar dataKey="Income" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  isCount = false,
}: {
  label: string;
  value: number;
  tone: "indigo" | "green" | "red" | "slate";
  isCount?: boolean;
}) {
  const tones = {
    indigo: "text-indigo-600",
    green: "text-green-600",
    red: "text-red-600",
    slate: "text-slate-800",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-5">
      <div className="text-sm text-slate-500 font-medium">{label}</div>
      <div className={`text-2xl md:text-3xl font-bold mt-2 ${tones[tone]}`}>
        {isCount ? value : `₹${value.toLocaleString("en-IN")}`}
      </div>
    </div>
  );
}
