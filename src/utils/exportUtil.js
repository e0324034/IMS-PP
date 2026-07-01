/**
 * Reusable utility to convert array of objects into Microsoft Excel compatible CSV format and download it.
 * @param {Array<Object>} data The dataset array to export.
 * @param {Array<string>} headers The keys of the object to include as columns in the CSV.
 * @param {string} filename The name of the downloaded file.
 * @param {Function} showToast Callback to trigger UI alerts.
 */
export const exportToCSV = (data, headers, filename, showToast) => {
  try {
    if (!data || data.length === 0) {
      if (showToast) showToast("No data available to export", "warning");
      return;
    }

    let csvContent = "";
    
    // Add Header Row
    csvContent += headers.map(h => `"${h.toUpperCase()}"`).join(',') + '\r\n';
    
    for (let i = 0; i < data.length; i++) {
      let line = '';
      for (let index = 0; index < headers.length; index++) {
        if (line !== '') line += ',';
        const head = headers[index];
        
        // Resolve nested dot notation property paths (e.g. 'product.name')
        let val = data[i];
        if (head.includes('.')) {
          const parts = head.split('.');
          for (let p of parts) {
            val = val ? val[p] : '';
          }
        } else {
          val = val ? val[head] : '';
        }
        
        if (val === undefined || val === null) {
          val = '';
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
        
        let valString = String(val).replace(/"/g, '""');
        if (valString.includes(',') || valString.includes('\n') || valString.includes('"')) {
          valString = `"${valString}"`;
        }
        line += valString;
      }
      csvContent += line + '\r\n';
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    if (showToast) {
      showToast("Data exported to Excel successfully!", "success");
    }
  } catch (error) {
    console.error("Export to CSV error:", error);
    if (showToast) {
      showToast("Failed to export data to Excel", "error");
    }
  }
};
