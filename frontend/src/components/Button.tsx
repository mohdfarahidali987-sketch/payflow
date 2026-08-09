interface buttonProps {
    label: string;
    onClick: () => void;
    disabled: boolean;
}
export const Button=(props:buttonProps)=>{
    return <button
    onClick={props.onClick}
    disabled={props.disabled}
    className="w-full bg-black text-white p-2 rounded-lg font-semibold mt-4 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
>
    {props.label}
</button>
}