// Variabel untuk menyimpan komentar yang terdeteksi
let detectedComments = [];
let judolPatterns = [];
let whitelistPatterns = []; // Daftar pola whitelist
let autoRemove = false;
let isScanning = false;
let lastCommentCount = 0;
let isExtensionValid = true; // Flag untuk mengecek apakah ekstensi masih valid

// Inisialisasi JudolDetector
const detector = new JudolDetector(); 

// Fungsi untuk melakukan inisialisasi setelah pengaturan dimuat
function initializeExtensionFeatures() {
  const isVideoOrShortsPage = window.location.href.includes('youtube.com/watch') || window.location.href.includes('youtube.com/shorts/');
  if (autoRemove && isVideoOrShortsPage) {
    setTimeout(() => {
      scanForJudolComments(true).catch(err => console.error("Error during initial auto-scan:", err));
    }, 3000);
  }

  // Setup listener navigasi
  setupNavigationListener();

  // Inisialisasi observer komentar jika di halaman video/shorts
  if (isVideoOrShortsPage) {
    setTimeout(setupCommentsObserver, 3000); // Tunggu DOM sedikit
  }
}

// Dapatkan pengaturan dari storage LALU inisialisasi fitur
chrome.storage.local.get(['judolPatterns', 'whitelistPatterns', 'autoRemove'], function(result) {
  if (chrome.runtime.lastError) {
    judolPatterns = [];
    whitelistPatterns = [];
    autoRemove = false;
    isExtensionValid = false; // Anggap tidak valid jika storage gagal
  } else {
    judolPatterns = result.judolPatterns || [];
    whitelistPatterns = result.whitelistPatterns || [];
    autoRemove = result.autoRemove || false;
  }
  // Panggil inisialisasi SETELAH mendapatkan nilai autoRemove
  initializeExtensionFeatures();
});

// Listener untuk pesan dari popup atau background
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Cek apakah ekstensi valid
  try {
    if (chrome.runtime.id) {
      isExtensionValid = true;
    } else {
      isExtensionValid = false;
      sendResponse({error: "Extension context invalidated"});
      return true;
    }
  } catch (err) {
    console.log("Ekstensi tidak valid saat menerima pesan:", err);
    isExtensionValid = false;
    sendResponse({error: "Extension context invalidated"});
    return true;
  }
  
  try {
    if (request.action === "scan") {
      // Handle pemindaian dengan menangkap kemungkinan error
      scanForJudolComments(false).then(count => {
        try {
          if (isExtensionValid) {
            sendResponse({count: count});
          }
        } catch (err) {
          console.error("Error saat mengirim respons scan:", err);
        }
      }).catch(err => {
        console.error("Error dalam pemindaian:", err);
        try {
          if (isExtensionValid) {
            sendResponse({error: err.message});
          }
        } catch (respErr) {
          console.error("Tidak bisa mengirim respons error:", respErr);
        }
      });
      return true;
    } else if (request.action === "remove") {
      const removePromise = removeJudolComments();
      removePromise.then(count => {
        try {
          sendResponse({count: count});
        } catch (err) {
          console.error("Error saat mengirim respons remove:", err);
        }
      }).catch(err => {
        console.error("Error dalam penghapusan:", err);
        try {
          sendResponse({error: err.message});
        } catch (respErr) {
          console.error("Tidak bisa mengirim respons error:", respErr);
        }
      });
      return true;
    } else if (request.action === "autoRemoveUpdated") {
      autoRemove = request.value;
      if (autoRemove) {
        // Panggil scan sekali saat diaktifkan
        scanForJudolComments(true).catch(err => {
          console.error("Error dalam pemindaian setelah update autoRemove:", err);
        });
      } else {
        restoreHiddenComments();
      }
      
      try {
        sendResponse({success: true, autoRemove: autoRemove});
      } catch (err) {
        console.error("Error saat mengirim respons autoRemoveUpdated:", err);
      }
      return true;
    } else if (request.action === "markAsFalsePositive") {
      if (request.text) {
        try {
          chrome.runtime.sendMessage({
            action: "addWhitelistPattern", 
            pattern: request.text
          }, function(backendResponse) {
            // Tangani respons dari background script dengan aman
            if (chrome.runtime.lastError) {
              console.error("Error saat menambahkan pattern whitelist:", chrome.runtime.lastError);
              return;
            }
            
            // Refresh pemindaian dengan pola whitelist baru
            setTimeout(() => {
              chrome.storage.local.get(['whitelistPatterns'], function(result) {
                if (chrome.runtime.lastError) {
                  console.error("Error saat mendapatkan whitelistPatterns:", chrome.runtime.lastError);
                  return;
                }
                whitelistPatterns = result.whitelistPatterns || [];
                scanForJudolComments(true).catch(err => {
                  console.error("Error dalam pemindaian setelah update whitelist:", err);
                });
              });
            }, 500);
          });
        } catch (err) {
          console.error("Error saat mengirim pesan addWhitelistPattern:", err);
        }
      }
      try {
        sendResponse({success: true});
      } catch (err) {
        console.error("Error saat mengirim respons markAsFalsePositive:", err);
      }
      return true;
    } else if (request.action === "markAsJudol") {
      if (request.text) {
        try {
          if (!judolPatterns.includes(request.text)) {
            judolPatterns.push(request.text);
            
            if (typeof detector.updatePatterns === 'function') {
              const patternCount = detector.updatePatterns(judolPatterns, whitelistPatterns);
            } else {
              console.error("detector.updatePatterns is not a function! This is a critical error.");
            }
            
            const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');
            
            let matchedComments = [];
            commentElements.forEach(comment => {
              try {
                const commentContent = comment.querySelector('#content-text');
                if (commentContent) {
                  const commentText = commentContent.innerText || "";
                  
                  const detectorResultOnComment = detector.detectJudolComment(commentText);
                  
                  let isMatchForNewPattern = commentText.toLowerCase().includes(request.text.toLowerCase());

                  if (!isMatchForNewPattern && detectorResultOnComment.is_judol) {
                    const corePattern = request.text.replace(/[^\w\d]+/g, "").toLowerCase(); 
                    const commentCoreText = commentText.replace(/[^\w\d]+/g, "").toLowerCase();
                    if (commentCoreText.includes(corePattern) && corePattern.length > 2) {
                      isMatchForNewPattern = true;
                    }
                  }

                  if (isMatchForNewPattern) {
                    matchedComments.push(comment);
                    
                    if (autoRemove) {
                      comment.style.display = 'none';
                      comment.setAttribute('data-hidden-by-judol-cleaner', 'true');
                    }
                    
                    if (!detectedComments.includes(comment)) {
                      detectedComments.push(comment);
                    }
                  }
                }
              } catch (error) {
                console.error("Error checking comment with new pattern:", error);
              }
            });
            
            setTimeout(() => {
              scanForJudolComments(true).then(() => {
              }).catch(err => {
                console.error("Error during full scan after pattern addition:", err);
              });
            }, 500);
          } else {
          }
          
          chrome.runtime.sendMessage({
            action: "addJudolPattern", 
            pattern: request.text
          }, function(backendResponse) {
            if (chrome.runtime.lastError) {
              console.error("Error saving pattern to storage:", chrome.runtime.lastError);
              return;
            }
          });
        } catch (err) {
          console.error("Error processing new judol pattern:", err);
        }
      }
      
      try {
        sendResponse({success: true});
      } catch (err) {
        console.error("Error sending response for markAsJudol:", err);
      }
      return true;
    }
  } catch (err) {
    console.error("Error dalam message listener:", err);
    // Tandai ekstensi sebagai tidak valid jika terjadi error
    if (err.message && err.message.includes("Extension context invalidated")) {
      isExtensionValid = false;
    }
    try {
      sendResponse({error: err.message});
    } catch (respErr) {
      console.error("Tidak bisa mengirim respons error:", respErr);
    }
    return true;
  }
});

// Tambahkan pengecekan validitas ekstensi dengan interval reguler
const checkExtensionValidity = () => {
  try {
    if (chrome.runtime.id) {
      isExtensionValid = true;
    } else {
      isExtensionValid = false;
    }
  } catch (err) {
    console.log("Ekstensi tidak valid:", err);
    isExtensionValid = false;
  }
};

// Jalankan pengecekan setiap 5 detik
setInterval(checkExtensionValidity, 5000);

// Tambahkan event listener untuk deteksi page unload
window.addEventListener('beforeunload', function() {
  isExtensionValid = false;
});

// Debounce function to limit scan frequency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced scan function
const debouncedScan = debounce(() => {
  const isVideoOrShortsPage = window.location.href.includes('youtube.com/watch') || window.location.href.includes('youtube.com/shorts/');
  if (autoRemove && isExtensionValid && isVideoOrShortsPage) {
    scanForJudolComments(true).catch(err => {
      console.error("Error in debounced auto-scan:", err);
    });
  }
}, 1500);

// Observer untuk mendeteksi komentar baru
let commentObserver = null;
function setupCommentsObserver() {
  const isVideoOrShortsPage = window.location.href.includes('youtube.com/watch') || window.location.href.includes('youtube.com/shorts/');
  if (!isExtensionValid || !isVideoOrShortsPage) {
      return;
  }

  // Target selectors ditingkatkan untuk lebih presisi pada komentar YouTube
  const targetSelectors = [
    'ytd-comments#comments #contents', // Video biasa
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] #contents', // Shorts
    '#comments #continuations', // Container continuations (load more) pada video
    'ytd-item-section-renderer #contents' // Video section
  ];

  // Cara baru: mencari semua kemungkinan container komentar
  let targetNodes = [];
  targetSelectors.forEach(selector => {
    const nodes = document.querySelectorAll(selector);
    if (nodes && nodes.length > 0) {
      nodes.forEach(node => targetNodes.push(node));
    }
  });

  if (targetNodes.length === 0) {
    setTimeout(setupCommentsObserver, 2000); // Coba lagi setelah 2 detik
    return;
  }

  if (commentObserver) {
    commentObserver.disconnect(); // Hentikan observer lama jika ada
  }

  const config = { 
    childList: true, 
    subtree: true,
    attributes: true, // Monitor juga perubahan atribut
    attributeFilter: ['hidden', 'disabled'] // Yang terkait dengan visibility
  };

  const callback = function(mutationsList, observer) {
    let commentAdded = false;
    let commentsVisible = false;
    
    // Pemeriksaan tipe mutasi yang lebih komprehensif
    for(const mutation of mutationsList) {
      // Cek perubahan atribut (visibilitas)
      if (mutation.type === 'attributes' && 
         (mutation.attributeName === 'hidden' || mutation.attributeName === 'disabled')) {
        // Elemen mungkin baru dimunculkan (atribut hidden dihapus)
        if (!mutation.target.hidden && !mutation.target.disabled) {
          commentsVisible = true;
        }
      }
      
      // Cek node baru ditambahkan
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          // Cek untuk komentar baru
          if (node.nodeName === 'YTD-COMMENT-THREAD-RENDERER') {
            commentAdded = true;
          }
          // Juga cek jika node container dimuat
          else if (node.querySelector) {
            // Coba cari komentar di dalam node yang ditambahkan
            const hasComments = node.querySelector('ytd-comment-thread-renderer');
            if (hasComments) {
              commentAdded = true;
            }
          }
        });
      }
    }
    
    // Scan dipicu jika ada komentar baru atau komentar container menjadi terlihat
    if ((commentAdded || commentsVisible) && autoRemove) {
      debouncedScan();
    }
  };

  // Terapkan observer ke semua target node
  commentObserver = new MutationObserver(callback);
  targetNodes.forEach(node => {
    try {
      commentObserver.observe(node, config);
    } catch (err) {
      console.error("Error observing node:", err);
    }
  });
  
  // Scroll event listener untuk memastikan scan ketika pengguna scroll
  // YouTube sering memuat komentar baru saat scroll
  const scrollHandler = debounce(() => {
    if (autoRemove && isExtensionValid && 
        (window.location.href.includes('youtube.com/watch') || 
         window.location.href.includes('youtube.com/shorts/'))) {
      scanForJudolComments(true).catch(err => {
        console.error("Error in scroll-triggered scan:", err);
      });
    }
  }, 1000); // Debounce scroll event (1 detik)
  
  // Tambahkan scroll listener jika belum ada
  window.removeEventListener('scroll', scrollHandler); // Hapus yang mungkin sudah ada
  window.addEventListener('scroll', scrollHandler);
}

// --- PINDAHKAN LISTENER NAVIGASI KE FUNGSI SENDIRI ---
let navigationObserver = null; // Simpan referensi observer
function setupNavigationListener() {
  if (navigationObserver) {
     return;
  }
  let lastUrl = location.href;
  navigationObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      const isVideoOrShortsPage = url.includes('youtube.com/watch') || url.includes('youtube.com/shorts/');
      if (isVideoOrShortsPage) {
        setTimeout(() => {
          detectedComments = [];
          setupCommentsObserver(); // Setup observer komentar lagi
          if (autoRemove) {
            scanForJudolComments(true).catch(err => {
              console.error("Error scanning after navigation:", err);
            });
          }
        }, 1500);
      } else {
        if (commentObserver) {
          commentObserver.disconnect();
          commentObserver = null;
        }
      }
    }
  });
  navigationObserver.observe(document.body, {childList: true, subtree: true});
}
// --- AKHIR PEMINDAHAN LISTENER NAVIGASI ---

// Fungsi untuk memindai komentar judol
async function scanForJudolComments(autoRemoveMode = false) {
  if (!isExtensionValid) return (detectedComments ? detectedComments.length : 0);
  if (isScanning) {
      return (detectedComments ? detectedComments.length : 0);
  }
  isScanning = true;
  
  try {
    // Update detector with current patterns
    if (typeof detector.updatePatterns === 'function') {
      detector.updatePatterns(judolPatterns, whitelistPatterns);
    }
    
    const commentSection = await waitForCommentSection(); 
    if (!commentSection) {
      isScanning = false;
      return 0;
    }

    const firstCommentElement = await waitForFirstCommentElement();
    if (!firstCommentElement) {
       isScanning = false;
       return (detectedComments ? detectedComments.length : 0);
    }

    const commentElements = document.querySelectorAll('ytd-comment-thread-renderer');
    console.log("Number of comment elements found:", commentElements.length);
    
    if (autoRemoveMode && lastCommentCount === commentElements.length && detectedComments && detectedComments.length > 0) {
      isScanning = false;
      return detectedComments.length;
    }
    
    lastCommentCount = commentElements.length;
    console.log("Jumlah komentar ditemukan:", commentElements.length);
    
    commentElements.forEach(comment => {
      if (!isExtensionValid) {
        throw new Error("Extension context invalidated during comment iteration");
      }
      
      if (detectedComments.includes(comment)) {
        if (autoRemove) {
          comment.style.display = 'none';
        }
        return;
      }
      
      const commentContent = comment.querySelector('#content-text');
      if (commentContent) {
        const commentText = commentContent.innerText;
        
        // *** Gunakan JudolDetector ***
        const detectionResult = detector.detectJudolComment(commentText);
        
        if (detectionResult.is_judol) {
          // Hanya tambahkan ke daftar jika belum ada
          if (!detectedComments.includes(comment)) {
            detectedComments.push(comment);
          }
          
          // Tandai komentar yang terdeteksi
          comment.style.border = '2px solid red';
          comment.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
          
          // Jika autoRemove diaktifkan, sembunyikan komentar
          if (autoRemove) {
            comment.style.display = 'none';
          }
        } else {
           // Opsional: Hapus border jika sebelumnya ditandai tapi sekarang tidak terdeteksi
           if (comment.style.border.includes('red')) {
             comment.style.border = '';
             comment.style.backgroundColor = '';
           }
        }
      }
    });

    // Simpan jumlah terdeteksi
    try {
      chrome.storage.local.set({detectedCount: (detectedComments ? detectedComments.length : 0)}, function() {
        if (chrome.runtime.lastError) {
          console.error("Error saat menyimpan detectedCount:", chrome.runtime.lastError);
        }
      });
      // Jika dalam mode auto-remove, update juga removedCount karena komentar disembunyikan
      if (autoRemoveMode) {
        chrome.storage.local.set({removedCount: (detectedComments ? detectedComments.length : 0)}, function() {
          if (chrome.runtime.lastError) {
            console.error("Error saat menyimpan removedCount (auto-mode):", chrome.runtime.lastError);
          }
        });
      }
    } catch (err) {
      console.error("Gagal menyimpan count ke storage:", err); // Pesan error lebih generik
      if (err.message && err.message.includes("Extension context invalidated")) {
        isExtensionValid = false;
      }
    }
    
  } catch (err) {
    console.error("Error dalam scanForJudolComments:", err);
    if (err.message && err.message.includes("Extension context invalidated")) {
      isExtensionValid = false;
    }
  } finally {
    isScanning = false;
  }
  
  return (detectedComments ? detectedComments.length : 0);
}

// Fungsi untuk menghapus komentar judol
async function removeJudolComments() {
  if (!isExtensionValid) return 0;
  let count = 0;
  const commentsToRemove = detectedComments.slice(); // Salin array agar tidak terpengaruh perubahan selama iterasi

  for (const commentElement of commentsToRemove) {
    try {
       // Cek validitas ekstensi sebelum setiap penghapusan
      if (!chrome.runtime.id) throw new Error("Invalid context");

      if (commentElement && commentElement.isConnected) { // Pastikan elemen masih ada di DOM
        // Metode yang lebih aman: sembunyikan daripada hapus total
        commentElement.style.display = 'none';
        // Tambahkan atribut untuk menandai bahwa elemen disembunyikan oleh ekstensi
        commentElement.setAttribute('data-hidden-by-judol-cleaner', 'true');
        count++;
      } else {
      }
    } catch (error) {
      console.error("Error removing comment:", error, commentElement);
      // Jika konteks hilang, hentikan proses
      if (error.message && error.message.includes("Extension context invalidated")) {
        isExtensionValid = false;
        break; // Keluar dari loop
      }
    }
  }

  // Update local storage dengan jumlah yang dihapus
  if (count > 0 && isExtensionValid) { // Hanya update jika ada yang dihapus dan ekstensi valid
     try {
      chrome.storage.local.set({ removedCount: count }, () => {
         if (chrome.runtime.lastError) {
            console.error("Error saving removed count:", chrome.runtime.lastError);
         }
      });
     } catch (err) {
         console.error("Error setting removedCount in storage:", err);
     }
  }

  return count;
}

// Fungsi untuk mengembalikan komentar yang disembunyikan
function restoreHiddenComments() {
  if (!isExtensionValid) return;
  try {
    const hiddenComments = document.querySelectorAll('[data-hidden-by-judol-cleaner="true"]');
    hiddenComments.forEach(comment => {
      comment.style.display = ''; // Kembalikan display
      comment.removeAttribute('data-hidden-by-judol-cleaner'); // Hapus atribut penanda
    });
  } catch (error) {
     console.error("Error restoring comments:", error);
     if (error.message && error.message.includes("Extension context invalidated")) {
        isExtensionValid = false;
     }
  }
}

// Fungsi untuk menunggu elemen section komentar muncul
function waitForCommentSection() {
  return new Promise((resolve) => {
    const maxTries = 20;
    let tries = 0;
    
    const checkForComments = () => {
      const commentSection = document.querySelector('#comments');
      if (commentSection) {
        return resolve(commentSection);
      }
      
      tries++;
      if (tries >= maxTries) {
        return resolve(null);
      }
      
      setTimeout(checkForComments, 500);
    };
    
    checkForComments();
  });
}

// **** Fungsi BARU: Menunggu elemen komentar pertama muncul ****
function waitForFirstCommentElement() {
  return new Promise((resolve) => {
    const maxTries = 20; // Batas percobaan
    let tries = 0;

    const checkForFirstComment = () => {
      try {
        // Periksa validitas konteks
        if (!chrome.runtime.id) {
           return resolve(null); // Gagal jika konteks hilang
        }
        
        // Cari elemen komentar pertama di salah satu kemungkinan container
        const firstComment = document.querySelector('#comments ytd-comment-thread-renderer, ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] ytd-comment-thread-renderer');
        
        if (firstComment) {
          return resolve(firstComment); // Berhasil
        }
      } catch (error) {
         return resolve(null); // Gagal jika ada error query
      }
      
      tries++;
      if (tries >= maxTries) {
        return resolve(null); // Gagal jika timeout
      }
      
      // Coba lagi setelah delay
      setTimeout(checkForFirstComment, 500);
    };
    
    checkForFirstComment();
  });
}
// **** AKHIR FUNGSI BARU ****

// Tambahkan pengecekkan pola Alexis-17 di judol_detector.js (hanya untuk referensi, tidak perlu edit file ini)
// Di constructor JudolDetector, tambahkan pola ke namaSitusJudiDasar:
/*
this.namaSitusJudiDasar = [
  // Pola yang sudah ada...
  "𝘼LEXIS-17", "ALEXIS-17", "ALEXIS17", 
  // ...
];
*/ 