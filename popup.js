document.addEventListener('DOMContentLoaded', function() {
  const scanButton = document.getElementById('scanButton');
  const removeButton = document.getElementById('removeButton');
  const autoRemoveCheckbox = document.getElementById('autoRemove');
  const statusText = document.getElementById('statusText');
  const detectedCount = document.getElementById('detectedCount');
  const removedCount = document.getElementById('removedCount');
  
  // Elements for reporting
  const reportFalsePositiveBtn = document.getElementById('reportFalsePositive');
  const reportMissedJudolBtn = document.getElementById('reportMissedJudol');
  const falsePositiveForm = document.getElementById('reportFalsePositiveForm');
  const missedJudolForm = document.getElementById('reportMissedJudolForm');
  const submitFalsePositiveBtn = document.getElementById('submitFalsePositive');
  const submitMissedJudolBtn = document.getElementById('submitMissedJudol');
  const falsePositiveText = document.getElementById('falsePositiveText');
  const missedJudolText = document.getElementById('missedJudolText');

  // Muat pengaturan dari storage
  chrome.storage.local.get(['autoRemove', 'detectedCount', 'removedCount'], function(result) {
    autoRemoveCheckbox.checked = result.autoRemove || false;
    
    // Tampilkan jumlah yang terdeteksi/dihapus sebelumnya jika ada
    if (result.detectedCount) {
      detectedCount.textContent = result.detectedCount;
    }
    if (result.removedCount) {
      removedCount.textContent = result.removedCount;
    }
  });

  // Simpan pengaturan saat berubah dan beritahu content script
  autoRemoveCheckbox.addEventListener('change', function() {
    const isAutoRemove = autoRemoveCheckbox.checked;
    statusText.textContent = 'Menyimpan pengaturan...';
    
    // Simpan pengaturan di storage
    chrome.storage.local.set({autoRemove: isAutoRemove}, function() {
      console.log("Pengaturan disimpan:", isAutoRemove);
      
      // Beritahu content script bahwa pengaturan autoRemove telah berubah
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url.includes('youtube.com')) {
          chrome.tabs.sendMessage(
            tabs[0].id, 
            {
              action: "autoRemoveUpdated", 
              value: isAutoRemove
            },
            function(response) {
              console.log("Respon dari content script:", response);
              
              // Update status berdasarkan respon
              if (response && response.success) {
                if (isAutoRemove) {
                  statusText.textContent = 'Mode auto-remove aktif';
                  // Jika ada komentar yang terdeteksi, lakukan pemindaian ulang
                  if (parseInt(detectedCount.textContent) > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "scan"}, function(scanResponse) {
                      if (scanResponse && scanResponse.count !== undefined) {
                        detectedCount.textContent = scanResponse.count;
                        removedCount.textContent = scanResponse.count; // Update juga jumlah yang dihapus
                      }
                    });
                  }
                } else {
                  statusText.textContent = 'Mode auto-remove nonaktif';
                }
              } else {
                statusText.textContent = 'Pengaturan diperbarui, tetapi halaman mungkin perlu dimuat ulang';
              }
            }
          );
        } else {
          // Jika tidak di halaman YouTube
          if (isAutoRemove) {
            statusText.textContent = 'Mode auto-remove aktif, buka YouTube untuk menggunakannya';
          } else {
            statusText.textContent = 'Mode auto-remove nonaktif';
          }
        }
      });
    });
  });

  // Pindai komentar Judol
  scanButton.addEventListener('click', function() {
    statusText.textContent = 'Memindai...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "scan"}, function(response) {
        if (response && response.count !== undefined) {
          statusText.textContent = 'Pemindaian selesai';
          detectedCount.textContent = response.count;
        } else {
          statusText.textContent = 'Halaman tidak didukung';
        }
      });
    });
  });

  // Hapus komentar Judol
  removeButton.addEventListener('click', function() {
    statusText.textContent = 'Menghapus...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "remove"}, function(response) {
        if (response && response.count !== undefined) {
          statusText.textContent = 'Penghapusan selesai';
          removedCount.textContent = response.count;
        } else {
          statusText.textContent = 'Halaman tidak didukung';
        }
      });
    });
  });

  // Toggle form laporan false positive
  reportFalsePositiveBtn.addEventListener('click', function() {
    falsePositiveForm.style.display = falsePositiveForm.style.display === 'none' || falsePositiveForm.style.display === '' ? 'block' : 'none';
    missedJudolForm.style.display = 'none'; // Tutup form lainnya
  });
  
  // Toggle form laporan judol terlewat
  reportMissedJudolBtn.addEventListener('click', function() {
    missedJudolForm.style.display = missedJudolForm.style.display === 'none' || missedJudolForm.style.display === '' ? 'block' : 'none';
    falsePositiveForm.style.display = 'none'; // Tutup form lainnya
  });
  
  // Submit laporan false positive
  submitFalsePositiveBtn.addEventListener('click', function() {
    const text = falsePositiveText.value.trim();
    if (text) {
      statusText.textContent = 'Menambahkan ke whitelist...';
      
      chrome.runtime.sendMessage({
        action: "addWhitelistPattern",
        pattern: text
      }, function(response) {
        if (response && response.success) {
          statusText.textContent = 'Berhasil ditambahkan ke whitelist';
          falsePositiveText.value = '';
          falsePositiveForm.style.display = 'none';
          
          // Pemberitahuan ke content script untuk menyegarkan whitelist
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('youtube.com')) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "markAsFalsePositive",
                text: text
              });
            }
          });
        } else {
          statusText.textContent = 'Gagal menambahkan ke whitelist';
        }
      });
    } else {
      statusText.textContent = 'Teks laporan tidak boleh kosong';
    }
  });
  
  // Submit laporan judol terlewat
  submitMissedJudolBtn.addEventListener('click', function() {
    const text = missedJudolText.value.trim();
    if (text) {
      statusText.textContent = 'Menambahkan ke daftar judol...';
      
      chrome.runtime.sendMessage({
        action: "addJudolPattern",
        pattern: text
      }, function(response) {
        if (response && response.success) {
          statusText.textContent = 'Berhasil ditambahkan ke daftar judol';
          missedJudolText.value = '';
          missedJudolForm.style.display = 'none';
          
          // Pemberitahuan ke content script untuk menyegarkan daftar judol
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('youtube.com')) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "markAsJudol",
                text: text
              });
            }
          });
        } else {
          statusText.textContent = 'Gagal menambahkan ke daftar judol';
        }
      });
    } else {
      statusText.textContent = 'Teks tidak boleh kosong';
    }
  });

  // Periksa apakah ekstensi berada di halaman YouTube
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const url = tabs[0].url;
    if (!url.includes('youtube.com')) {
      statusText.textContent = 'Bukan halaman YouTube';
      scanButton.disabled = true;
      removeButton.disabled = true;
    } else if (autoRemoveCheckbox.checked) {
      // Jika di halaman YouTube dan auto-remove aktif
      statusText.textContent = 'Mode auto-remove aktif';
    } else {
      statusText.textContent = 'Siap';
    }
  });
}); 