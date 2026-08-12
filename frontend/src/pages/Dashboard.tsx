import { Appbar } from "../components/Appbar";
import { Balance } from "../components/Balance";
import { Users } from "../components/Users";
import { TransactionHistory } from "../components/TransactionHistory";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function Dashboard() {
  const [balance, setBalance] = useState(0);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    async function fetchBalance() {
      try {
        const response = await api.get("/api/v1/account/balance");
        setBalance(response.data.balance);
      } catch (err) {
        console.log(err);
      }
    }

    fetchBalance();
  }, []);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await api.get("/api/v1/user/me");
        setFirstName(response.data.firstName);
      } catch (err) {
        console.log(err);
      }
    }

    fetchUser();
  }, []);

  return (
    <div>
      <Appbar firstName={firstName} />

      <div className="m-4 md:m-8">
        <Balance value={balance} />
        <TransactionHistory />
        <Users />
      </div>
    </div>
  );
}