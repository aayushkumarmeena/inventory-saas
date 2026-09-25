export const fmtCurrency=n=>'₹'+Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2});
export const fmtDate=d=>d?new Date(d).toLocaleDateString('en-IN'):'—';
export const validateGstin=g=>/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g);

export function downloadBlob(blobData, filename) {
  const url = URL.createObjectURL(new Blob([blobData]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function amountInWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function inWords(n) {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '') + ' ';
    if (n < 1000) return inWords(Math.floor(n / 100)) + 'Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Rupees Only';
  const paise = Math.round((Math.abs(Number(num) || 0) - n) * 100);
  let res = 'Rupees ' + inWords(n).trim().replace(/\s+/g, ' ');
  if (paise > 0) res += ' and ' + inWords(paise).trim().replace(/\s+/g, ' ') + ' Paise';
  return res + ' Only';
}
