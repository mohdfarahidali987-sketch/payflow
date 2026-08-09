import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import {AxiosError} from "axios";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
export function SendMoney() {

    const [searchParams] = useSearchParams();

    const id = searchParams.get("id")!;
    const name = searchParams.get("name")!;

    const [amount, setAmount] = useState("");
    const navigate=useNavigate();

    return (
        <div className="bg-slate-300 h-screen flex justify-center">
            <div className="flex flex-col justify-center">

                <div className="rounded-lg bg-white w-80 p-6">

                    <div className="text-3xl font-bold text-center mb-8">
                        Send Money
                    </div>

                    <div className="flex items-center mb-8">

                        <div className="rounded-full h-12 w-12 bg-green-500 flex justify-center items-center mr-3">

                            <span className="text-2xl text-white font-bold">
                                {name[0].toUpperCase()}
                            </span>

                        </div>

                        <div className="text-xl font-semibold">
                            {name}
                        </div>

                    </div>

                    <div className="mb-2 font-medium">
                        Amount (in Rs)
                    </div>

                    <input
                        type="number"
                        placeholder="Enter amount"
                        className="border rounded w-full p-2 mb-4"
                        onChange={(e) => {
                            setAmount(e.target.value);
                        }}
                    />

                    <button
    className="bg-green-500 w-full text-white py-2 rounded-lg"
    onClick={async () => {
        try {
            await api.post(
    "/api/v1/account/transfer",
    {
        to: id,
        amount: Number(amount)
    }
);

            toast.success(`₹${amount} transferred to ${name}`);

             setTimeout(() => {
              navigate("/dashboard");
             }, 1000);

        } catch (err) {
    const error = err as AxiosError<{ message: string }>;

    toast.error(
        error.response?.data?.message || "Transfer Failed"
    );

    console.error(error);
       }
       finally{
        setTimeout(() => {
              navigate("/dashboard");
             }, 1000);
       }
    }}
>
    Initiate Transfer
</button>

                </div>

            </div>
        </div>
    );
}