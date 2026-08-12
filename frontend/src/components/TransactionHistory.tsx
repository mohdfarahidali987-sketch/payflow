import { useEffect, useState } from "react";
import { api } from "../lib/api";

const CATEGORIES = [
  "Food",
  "Shopping",
  "Travel",
  "Bills",
  "Entertainment",
  "Education",
  "Healthcare",
  "Other",
] as const;

type Party = {
  _id: string;
  firstName: string;
  lastName: string;
  username?: string;
};

type TransactionItem = {
  transactionId: string;
  amount: number;
  type: string;
  direction: "DEBIT" | "CREDIT";
  status: string;
  category: string;
  description: string;
  isAnomaly?: boolean;
  sender: Party;
  receiver: Party;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function partyName(party: Party) {
  return `${party.firstName} ${party.lastName}`.trim();
}

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/api/v1/transactions", {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            category: category || undefined,
            sort,
            from: from || undefined,
            to: to || undefined,
          },
        });

        setTransactions(response.data.transactions);
        setPagination(response.data.pagination);
      } catch {
        setError("Could not load transactions");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchTransactions, 250);
    return () => clearTimeout(timer);
  }, [page, search, category, sort, from, to]);

  return (
    <div className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="font-bold text-lg">Transaction History</h2>
        <p className="text-sm text-slate-500">
          {pagination.total} transaction{pagination.total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
        <input
          type="text"
          placeholder="Search description..."
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount_desc">Amount high → low</option>
          <option value="amount_asc">Amount low → high</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => {
            setPage(1);
            setFrom(e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <input
          type="date"
          value={to}
          onChange={(e) => {
            setPage(1);
            setTo(e.target.value);
          }}
          className="border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-slate-500">
          Loading transactions...
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-red-500">
          {error}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <h3 className="text-lg font-semibold text-slate-700">No transactions yet</h3>
          <p className="text-slate-500 mt-2">
            Transfers you send or receive will show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const other =
                    tx.direction === "DEBIT" ? tx.receiver : tx.sender;

                  return (
                    <tr
                      key={tx.transactionId}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {partyName(other)}
                        {tx.isAnomaly ? (
                          <span className="ml-2 text-xs text-amber-600">Unusual</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-sm">{tx.direction}</td>
                      <td className="px-4 py-3 text-sm">{tx.category}</td>
                      <td className="px-4 py-3 text-sm">{tx.status}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {tx.description || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          tx.direction === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.direction === "CREDIT" ? "+" : "-"}₹
                        {tx.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {transactions.map((tx) => {
              const other = tx.direction === "DEBIT" ? tx.receiver : tx.sender;

              return (
                <div
                  key={tx.transactionId}
                  className="bg-white rounded-xl shadow-md p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{partyName(other)}</div>
                      <div className="text-sm text-slate-500 mt-1">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        tx.direction === "CREDIT"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.direction === "CREDIT" ? "+" : "-"}₹
                      {tx.amount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">
                      {tx.direction}
                    </span>
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">
                      {tx.category}
                    </span>
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">
                      {tx.status}
                    </span>
                    {tx.isAnomaly ? (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                        Unusual
                      </span>
                    ) : null}
                  </div>
                  {tx.description ? (
                    <p className="text-sm text-slate-500 mt-2">{tx.description}</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
