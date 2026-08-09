interface InputBoxProps {
    label:string,
    placeholder:string,
     onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

}
export const InputBox=(props:InputBoxProps)=>{
    return <div>
        <div className="text-sm font-medium text-left py-2">
            {props.label}
        </div>
        <input type="text" placeholder={props.placeholder} onChange={props.onChange}
        className="w-full px-2 py-2 border rounded border-state-200"
        />


    </div>
}
