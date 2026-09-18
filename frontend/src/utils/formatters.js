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
