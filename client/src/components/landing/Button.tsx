import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

const Button = ({ children, className = "", ...rest }: ButtonProps) => {
  return (
    <button
      type="button"
      className={`${className} rounded-[10px] text-center text-white px-4 md:px-6 py-2 hover:transition hover:opacity-90 bg-primary border border-primary flex items-center gap-2`}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
