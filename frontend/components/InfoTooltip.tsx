import { Info } from 'lucide-react';

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="relative group inline-flex items-center justify-center ml-1.5 align-middle">
      <Info size={14} className="text-gray-400 hover:text-gray-600 transition-colors cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[260px] p-2.5 bg-gray-900 text-white text-[11px] font-medium leading-relaxed rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.2)] opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible transition-all duration-200 ease-out z-[100] pointer-events-none border border-gray-800 backdrop-blur-md whitespace-normal text-center">
        {text}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-gray-800" />
      </div>
    </div>
  );
}
