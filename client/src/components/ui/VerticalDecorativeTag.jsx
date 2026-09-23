export default function VerticalDecorativeTag({ className = "" }) {
  return (
    <div className={`flex flex-col text-[9px] font-bold tracking-widest text-[#475875] select-none border-l-2 border-[#D9E3F0] pl-2 uppercase leading-snug ${className}`} aria-hidden="true">
      <span>INDIA</span>
      <span>WEATHER</span>
      <span>PEOPLE</span>
      <span>PROGRESS</span>
    </div>
  );
}

