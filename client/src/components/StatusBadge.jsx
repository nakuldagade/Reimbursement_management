export default function StatusBadge({ status }) {
  const styles = {
    PENDING: 'bg-[#332415] text-[#f59e0b]',
    APPROVED: 'bg-[#14291f] text-[#22c55e]',
    REJECTED: 'bg-[#361a1a] text-[#ef4444]',
  };

  const dotColors = {
    PENDING: 'bg-[#f59e0b]',
    APPROVED: 'bg-[#22c55e]',
    REJECTED: 'bg-[#ef4444]',
  };

  const formatStatus = (s) => s ? s.charAt(0) + s.slice(1).toLowerCase() : '';

  return (
    <span className={`inline-flex items-center gap-[6px] px-3 py-1 rounded-full text-[12.5px] font-medium border border-white/5 ${styles[status] || 'bg-surface3 text-muted'}`}>
      <span className={`w-[5px] h-[5px] rounded-full ${dotColors[status] || 'bg-muted'}`}></span>
      {formatStatus(status)}
    </span>
  );
}
