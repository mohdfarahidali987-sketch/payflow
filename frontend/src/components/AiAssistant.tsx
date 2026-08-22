import { useEffect, useState } from "react";
import { api } from "../lib/api";
import toast from "react-hot-toast";

export function AiAssistant() {
  const [configured, setConfigured] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [insight, setInsight] = useState("");
  const [monthlySummary, setMonthlySummary] = useState("");
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingExtras, setLoadingExtras] = useState(false);

  useEffect(() => {
    async function loadStatusAndInsights() {
      try {
        const status = await api.get("/api/v1/ai/status");
        setConfigured(status.data.configured);

        if (!status.data.configured) {
          setInsight("Add AI_API_KEY to the backend environment.");
          return;
        }

        setLoadingExtras(true);
        const [insightsRes, summaryRes] = await Promise.all([
          api.get("/api/v1/ai/insights"),
          api.get("/api/v1/ai/monthly-summary"),
        ]);
        setInsight(insightsRes.data.insight);
        setMonthlySummary(summaryRes.data.summary);
      } catch {
        setInsight("AI insights are currently unavailable.");
      } finally {
        setLoadingExtras(false);
      }
    }

    loadStatusAndInsights();
  }, []);

  async function askAssistant() {
    if (!question.trim()) {
      toast.error("Enter a question");
      return;
    }

    setLoadingAsk(true);
    try {
      const response = await api.post("/api/v1/ai/assistant", {
        question: question.trim(),
      });
      setAnswer(response.data.answer);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "AI assistant unavailable";
      toast.error(message);
    } finally {
      setLoadingAsk(false);
    }
  }

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-bold text-lg">PayFlow AI</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="font-semibold mb-2">AI Financial Assistant</h3>
          <p className="text-sm text-slate-500 mb-4">
            Ask about your spending using your real transaction history.
          </p>

          {!configured ? (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              AI is not configured. Add <code>AI_API_KEY</code> to the backend
              environment (OpenAI).
            </div>
          ) : (
            <>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="e.g. How much did I spend on food this month?"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={askAssistant}
                disabled={loadingAsk}
                className="mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg font-medium"
              >
                {loadingAsk ? "Thinking..." : "Ask PayFlow AI"}
              </button>
              {answer ? (
                <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                  {answer}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold mb-2">Spending Insight</h3>
            {loadingExtras ? (
              <p className="text-sm text-slate-500">Generating insight...</p>
            ) : (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{insight}</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-5">
            <h3 className="font-semibold mb-2">Monthly Financial Summary</h3>
            {loadingExtras ? (
              <p className="text-sm text-slate-500">Generating summary...</p>
            ) : monthlySummary ? (
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {monthlySummary}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Summary will appear when AI is configured and you have transactions.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
