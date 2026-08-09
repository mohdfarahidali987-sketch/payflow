interface SubheadingProps{
    label:string

}
export function SubHeading(props:SubheadingProps){
    return <div className="text-slate-500 text-md pt-2 px-4 pb-4 text-center">
    {props.label}
    </div>
}