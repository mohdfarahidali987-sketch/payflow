import { Link } from "react-router-dom";

interface BottomWarningProps {
    label: string;
    buttonText: string;
    to: string;
}

export const BottomWarning=(props: BottomWarningProps)=> {
    return (
        <div className="py-2 text-sm flex justify-center">
            <div>
                {props.label}
            </div>

            <Link
                className="pointer underline pl-1"
                to={props.to}
            >
                {props.buttonText}
            </Link>
        </div>
    );
}