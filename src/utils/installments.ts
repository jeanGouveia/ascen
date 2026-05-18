/** Divide valor em N parcelas (centavos na última parcela). */
export function splitAmountEvenly(total: number, count: number): number[] {
  if (count < 1) return [total];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  const parts: number[] = [];
  for (let i = 0; i < count; i++) {
    const extra = i === count - 1 ? remainder : 0;
    parts.push((base + extra) / 100);
  }
  return parts;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Soma meses em uma data AAAA-MM-DD (dia preservado, limitado ao mês). */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1 + monthsToAdd, 1);
  const ny = date.getFullYear();
  const nm = date.getMonth() + 1;
  const lastDay = new Date(ny, nm, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${ny}-${pad(nm)}-${pad(day)}`;
}

export type InstallmentScheduleItem = {
  date: string;
  amount: number;
  installmentInfo: string;
};

export function buildInstallmentSchedule(params: {
  firstDate: string;
  count: number;
  amountMode: 'total' | 'per_installment';
  inputAmount: number;
}): InstallmentScheduleItem[] {
  const count = Math.max(1, Math.min(120, Math.floor(params.count)));
  const amounts =
    params.amountMode === 'per_installment'
      ? Array(count).fill(params.inputAmount)
      : splitAmountEvenly(params.inputAmount, count);

  return amounts.map((amount, i) => ({
    date: addMonthsToDate(params.firstDate, i),
    amount,
    installmentInfo: `${i + 1}/${count}`,
  }));
}
