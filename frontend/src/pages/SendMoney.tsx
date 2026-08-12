import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

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

export function SendMoney() {
  const [searchParams] = useSearchParams();

  const id = searchParams.get("id")!;
  const name = searchParams.get("name")!;

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Other");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="bg-slate-300 min-h-screen flex justify-center py-10 px-4">
      <div className="flex flex-col justify-center w-full max-w-md">
        <div className="rounded-lg bg-white w-full p-6">
          <div className="text-3xl font-bold text-center mb-8">Send Money</div>

          <div className="flex items-center mb-8">
            <div className="rounded-full h-12 w-12 bg-green-500 flex justify-center items-center mr-3">
              <span className="text-2xl text-white font-bold">
                {name[0].toUpperCase()}
              </span>
            </div>
            <div className="text-xl font-semibold">{name}</div>
          </div>

          <div className="mb-2 font-medium">Amount (in Rs)</div>
          <input
            type="number"
            placeholder="Enter amount"
            className="border rounded w-full p-2 mb-4"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div className="mb-2 font-medium">Description (optional)</div>
          <input
            type="text"
            placeholder="e.g. Uber ride, Netflix"
            className="border rounded w-full p-2 mb-4"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="mb-2 font-medium">Category</div>
          <select
            className="border rounded w-full p-2 mb-4 bg-white"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof CATEGORIES)[number])
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            disabled={loading}
            className="bg-green-500 w-full text-white py-2 rounded-lg disabled:opacity-60"
            onClick={async () => {
              if (!amount || Number(amount) <= 0) {
                toast.error("Invalid amount");
                return;
              }

              setLoading(true);
              try {
                const response = await api.post("/api/v1/account/transfer", {
                  to: id,
                  amount: Number(amount),
                  description,
                  category,
                });

                toast.success(`₹${amount} transferred to ${name}`);
                if (response.data?.anomaly?.detected) {
                  toast(
                    response.data.anomaly.reason ||
                      "Unusual transaction detected — amount is higher than your typical spend.",
                    { icon: "⚠️", duration: 5000 }
                  );
                }
                setTimeout(() => navigate("/dashboard"), 1200);
              } catch (err) {
                const error = err as AxiosError<{ message?: string; massage?: string }>;
                toast.error(
                  error.response?.data?.message ||
                    error.response?.data?.massage ||
                    "Transfer failed"
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Transferring..." : "Initiate Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
