import { logout } from "./apiClient/authApi.js";
import {
  getRequestLogs,
  getStudentDocuments,
  getStudentRequests,
  submitDocumentRequest,
} from "./apiClient/documentApi.js";

document.addEventListener("DOMContentLoaded", async () => {
  // --- Auth guard: requires STUDENT role ---
  // requireRole is defined in js/auth-guard.js which is loaded globally before this module
  if (typeof requireRole === 'function') {
    requireRole(["STUDENT"]);
  }

  // --- Element references ---
  const firstNameEl = document.getElementById("navbar-firstname");
  const firstNameMobileEl = document.getElementById("navbar-firstname-mobile");
  const logoutBtn = document.getElementById("logout-btn");
  const logoutBtnMobile = document.getElementById("logout-btn-mobile");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const cancelBtn = document.getElementById("cancel-btn");

  const sections = ['dashboard', 'request-document', 'my-requests'];

  // --- Helpers ---
  const getFirstName = () => {
      const email = sessionStorage.getItem("email") ?? "";
      return email.split("@")[0] ?? "Student";
  };

  const handleLogout = async () => {
      try {
        const accessToken = sessionStorage.getItem("ntc_access_token");
        const refreshToken = localStorage.getItem("ntc_refresh_token");
        if (accessToken && refreshToken) {
          await logout(refreshToken, accessToken);
        }
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "index.html";
      }
  };

  /**
   * Show the target section and hide all others.
   * Updates active styles for both desktop and mobile nav links.
   */
  const navigateTo = (targetId) => {
      sections.forEach(id => {
          const section = document.getElementById(id);
          if (section) {
              section.classList.toggle('hidden', id !== targetId);
          }
      });

      document.querySelectorAll('.nav-link').forEach(navLink => {
          const linkTarget = navLink.getAttribute('href').substring(1);
          if (linkTarget === targetId) {
              navLink.className = "nav-link text-sm font-bold text-blue-600 border-b-2 border-blue-600 pb-0.5";
          } else {
              navLink.className = "nav-link text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors";
          }
      });

      document.querySelectorAll('.nav-link-mobile').forEach(navLink => {
          const linkTarget = navLink.getAttribute('href').substring(1);
          if (linkTarget === targetId) {
              navLink.className = "nav-link-mobile text-sm font-bold text-blue-600 bg-blue-50 px-2 py-2 rounded-lg";
          } else {
              navLink.className = "nav-link-mobile text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-gray-50 px-2 py-2 rounded-lg transition-colors";
          }
      });
  };

  // --- Populate navbar name ---
  const firstName = getFirstName();
  if (firstNameEl) firstNameEl.textContent = firstName;
  if (firstNameMobileEl) firstNameMobileEl.textContent = firstName;

  // --- Desktop nav link clicks ---
  document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          navigateTo(targetId);
      });
  });

  // --- Mobile nav link clicks ---
  document.querySelectorAll('.nav-link-mobile').forEach(link => {
      link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          navigateTo(targetId);
          mobileMenu.classList.remove('open');
      });
  });

  // --- Logout buttons ---
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  if (logoutBtnMobile) logoutBtnMobile.addEventListener("click", handleLogout);

  // --- Cancel button ---
  if (cancelBtn) cancelBtn.addEventListener("click", () => {
      navigateTo('dashboard');
  });

  // --- Hamburger toggle ---
  if (hamburgerBtn) {
      hamburgerBtn.addEventListener("click", () => {
          mobileMenu.classList.toggle("open");
      });
  }

  // --- Show dashboard section by default on load ---
  navigateTo('dashboard');

  window.addEventListener("navigateTo", (e) => {
      navigateTo(e.detail.section);
  });

  // ============================================================
  // DOCUMENT REQUEST LOGIC
  // ============================================================

  const AUTH_TOKEN_KEY = "ntc_access_token";
  const form = document.getElementById("document-request-form");

  if (!form) return;

  const getAuthToken = () => sessionStorage.getItem(AUTH_TOKEN_KEY);
  let documentMap = {}; 

  const formatLabel = (type) =>
    (type || "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const loadDocumentTypes = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const documents = await getStudentDocuments(token);
      const documentTypeSelect = document.getElementById("documentType");

      if (documentTypeSelect && Array.isArray(documents)) {
        documentMap = {};
        documents.forEach(doc => {
          if (!documentMap[doc.documentType]) {
            documentMap[doc.documentType] = {
              id: doc.id,
              studentFullName: doc.studentFullName,
            };
          }
        });

        const uniqueTypes = Object.keys(documentMap);
        documentTypeSelect.innerHTML = '<option value="" disabled selected>Select document type</option>';
        uniqueTypes.forEach(type => {
          const option = document.createElement("option");
          option.value = type;
          option.textContent = formatLabel(type);
          documentTypeSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error loading document types:", error);
    }
  };

  const loadRequestLogs = async (documentRequestId) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const logs = await getRequestLogs(token, documentRequestId);
      const logsContainer = document.getElementById(`logs-${documentRequestId}`);

      if (logsContainer && Array.isArray(logs)) {
        if (logs.length === 0) {
          logsContainer.innerHTML = "<p class='text-sm text-gray-500'>No logs available.</p>";
          return;
        }

        logsContainer.innerHTML = "<h6 class='text-md font-semibold text-gray-700 mb-2'>Request Logs:</h6>";
        logs.forEach((log) => {
          const logDiv = document.createElement("div");
          logDiv.className = "text-sm text-gray-600 mb-1";
          logDiv.innerHTML = `
            <span class="font-medium">${log.requestStatus}</span> - ${new Date(log.dateAction).toLocaleString()} ${log.remarks ? `- ${log.remarks}` : ''}
          `;
          logsContainer.appendChild(logDiv);
        });
      }
    } catch (error) {
      console.error("Error loading request logs:", error);
    }
  };

  const loadDocumentRequests = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const requests = await getStudentRequests(token);
      const container = document.getElementById("document-requests-container");

      if (container && Array.isArray(requests)) {
        container.innerHTML = "";
        if (requests.length === 0) {
          container.innerHTML = "<p class='text-gray-600'>No document requests found.</p>";
          return;
        }

        for (const request of requests) {
          const requestDiv = document.createElement("div");
          requestDiv.className = "bg-white p-4 rounded-lg shadow mb-4 border-l-4 border-blue-500";
          requestDiv.innerHTML = `
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold text-blue-900 mb-1">${formatLabel(request.documentType)}</h3>
                <p class="text-gray-500 text-sm mb-3">Requested on ${new Date(request.requestedAt).toLocaleDateString()}</p>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                request.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                request.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }">${request.status}</span>
            </div>
            <div id="logs-${request.id}" class="mt-4 pt-4 border-t border-gray-100">
              <p class="text-xs text-gray-400 italic">Loading logs...</p>
            </div>
          `;
          container.appendChild(requestDiv);
          await loadRequestLogs(request.id);
        }
      }
    } catch (error) {
      console.error("Error loading document requests:", error);
    }
  };

  await loadDocumentTypes();
  await loadDocumentRequests();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const purpose = document.getElementById("purpose").value;
    const documentType = document.getElementById("documentType").value;
    const additionalDetails = document.getElementById("additionalDetails").value.trim();

    if (!purpose) {
      alert("Please select a purpose.");
      return;
    }

    const documentId = documentMap[documentType]?.id;
    if (!documentId) {
      alert("Please select a valid document type.");
      return;
    }

    const studentId = sessionStorage.getItem("userId");
    if (!studentId) {
      alert("Session error. Please log in again.");
      window.location.href = "index.html";
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No auth token found.");

      const requestBody = {
        purpose,
        documentType,
        documentId,
        additionalDetails,
        remarks: "",
        status: "PENDING",
        studentId: Number(studentId),
        registrarId: 0,
      };

      const data = await submitDocumentRequest(token, requestBody);
      const requestId = data?.requestId ?? data?.id ?? data?.data?.requestId;

      if (requestId) {
        alert("Document request submitted successfully!");
        form.reset();
        await loadDocumentRequests();
        navigateTo("dashboard");
      } else {
        throw new Error("Submission failed.");
      }
    } catch (error) {
      console.error("Error submitting request:", error.message);
      alert("Failed to submit request.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Request Document";
    }
  });

});
