import React from "react";

interface NumberFieldProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onchange'>{
        value : number
        onCommit : (n:number) => void
        fallback ?: number
        allowNegative ? :boolean
    }

export const NumberField : React.FC<NumberFieldProps> = ({
    value, onCommit, fallback, allowNegative
}) => {
    const [draft,setDraft] = React.useState<string | null> (null)

    const pattern = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value
        if(!pattern.test(text)) return
        setDraft(text)
        const n = Number(text)
        if(text != '' && !isNaN(n)) onCommit(n);
    }
    const handleBlur = () =>{
        const n = Number(draft ?? '')
        if( draft == '' || draft == null || isNaN(n)){
            if(fallback !== undefined){
                onCommit(fallback)
            }
        }

        setDraft(null);
    }

    return(
        <input
            type="text"
            inputMode="decimal"
            onChange={handleChange}
            onBlur={handleBlur}
            value={draft ?? (value === 0 ? '' : String(value))}
        />

    )
}
