interface BalanceProps {
    value: number;
}
 

export function Balance(props: BalanceProps) {
    return (
        
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
            <div className="text-gray-500 font-medium">
                Available Balance
            </div>

            <div className="text-4xl font-bold text-green-600 mt-2">
                ₹ {props.value.toLocaleString("en-IN")}
            </div>
        </div>
    );
}