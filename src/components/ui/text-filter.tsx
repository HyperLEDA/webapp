import { ReactElement } from "react";

interface TextFieldProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "number";
}

export function TextFilter({
  title,
  value,
  onChange,
  placeholder,
  type = "text",
}: TextFieldProps): ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {title}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-10 w-full"
      />
    </div>
  );
}
