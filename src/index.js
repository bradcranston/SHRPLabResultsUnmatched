// Lab Results Viewer Application
import HL7Parser from './hl7-parser.js';

class LabResultsViewer {
  constructor() {
    this._data = null;
    this.currentFilter = 'all';
    this.hl7Parser = new HL7Parser();
    this.init();
  }

  // Add getter/setter to track data changes
  get data() {
    return this._data;
  }

  set data(value) {
    console.log('Setting data to:', value ? 'object with keys: ' + Object.keys(value).join(', ') : 'null');
    console.trace('Data change stack trace:');
    this._data = value;
  }

  async init() {
    try {
      this.setupEventListeners();
      
      // Show loading state initially
      this.showLoading();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError(error.message);
    }
  }

  showLoading() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const resultsEl = document.getElementById('results-container');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (resultsEl) resultsEl.classList.add('hidden');
  }

  // Function to be called from FileMaker with HL7 data
  loadHL7Data(hl7Content) {
    try {
      // Add immediate visual feedback
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const resultsEl = document.getElementById('results-container');
      
      if (loadingEl) {
        loadingEl.innerHTML = '<p>Processing HL7 data...</p>';
        loadingEl.classList.remove('hidden');
      }
      if (errorEl) errorEl.classList.add('hidden');
      if (resultsEl) resultsEl.classList.add('hidden');
      
      if (!hl7Content || typeof hl7Content !== 'string') {
        throw new Error('Invalid HL7 data: Expected a string, got ' + typeof hl7Content);
      }
      
      if (hl7Content.length === 0) {
        throw new Error('Invalid HL7 data: Empty string provided');
      }
      
      // Parse the HL7 content
      this.data = this.hl7Parser.parseHL7String(hl7Content);
      
      // Debug: Check if PDF data was parsed
      console.log('HL7 data parsed successfully');
      console.log('PDF data found:', !!this.data.PDFData);
      if (this.data.PDFData) {
        console.log('PDF data length:', this.data.PDFData.length);
      }
      
      // Validate basic structure
      if (!this.data || typeof this.data !== 'object') {
        throw new Error('Invalid data structure: Expected an object');
      }
      
      // Render the results
      this.renderResults();
      
      return { success: true, message: 'HL7 data loaded successfully' };
      
    } catch (error) {
      console.error('Error in loadHL7Data:', error);
      this.showError(`Error loading lab results: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  setupEventListeners() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const filter = e.target.dataset.tab;
        this.setActiveTab(filter);
        this.filterResults(filter);
      });
    });

    // PDF button
    const pdfButton = document.getElementById('view-pdf-btn');
    if (pdfButton) {
      pdfButton.addEventListener('click', () => {
        this.viewPDF();
      });
    }
  }

  setActiveTab(activeTab) {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.classList.remove('active');
      if (button.dataset.tab === activeTab) {
        button.classList.add('active');
      }
    });
    this.currentFilter = activeTab;
  }

  showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-text').textContent = message;
  }

  renderResults() {
    // Force show the results container
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const resultsEl = document.getElementById('results-container');
    
    if (loadingEl) loadingEl.classList.add('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (resultsEl) {
      resultsEl.classList.remove('hidden');
    } else {
      console.error('Results container not found!');
      return;
    }

    this.renderPatientInfo();
    this.renderLabInfo();
    this.renderOBRInfo();
    this.renderTestResults();
    this.initializeCollapsibleSections();
  }

  viewPDF() {
    console.log('viewPDF called');
    console.log('this context:', this);
    console.log('this === labResultsViewer:', this === window.labResultsViewer);
    console.log('Data available:', !!this.data);
    console.log('PDF data available:', !!this.data?.PDFData);
    
    if (!this.data || !this.data.PDFData) {
      console.error('No PDF data available');
      console.log('Current data structure:', this.data);
      console.log('labResultsViewer.data:', window.labResultsViewer?.data);
      alert('No PDF data available to view');
      return;
    }

    console.log('PDF data length:', this.data.PDFData.length);
    console.log('Calling FileMaker script with PDF data');

    try {
      // Call FileMaker script with PDF base64 data as parameter
      // The script name should match what's expected in FileMaker
      if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
        // Use FileMaker JavaScript API
        console.log('Using FileMaker.PerformScript');
        window.FileMaker.PerformScript('View PDF Report', this.data.PDFData);
      } else if (typeof window.parent !== 'undefined' && window.parent.postMessage) {
        // Use postMessage as fallback for FileMaker WebViewer
        console.log('Using postMessage to parent');
        window.parent.postMessage({
          action: 'viewPDF',
          pdfData: this.data.PDFData
        }, '*');
      } else {
        // Direct function call fallback
        if (typeof window.viewPDFReport === 'function') {
          console.log('Using direct function call');
          window.viewPDFReport(this.data.PDFData);
        } else {
          console.error('FileMaker integration not available');
          alert('PDF viewing functionality is not available in this environment');
        }
      }
    } catch (error) {
      console.error('Error calling FileMaker script:', error);
      alert('Error viewing PDF: ' + error.message);
    }
  }

  renderPatientInfo() {
    const patientInfo = this.data.PID || {};
    const reportComments = this.data.NTE || [];
    const container = document.getElementById('patient-info');
    
    if (!container) {
      console.error('patient-info container not found');
      return;
    }
    
    const formattedName = this.formatPatientName(patientInfo.PatientName);
    
    const patientDetails = [
      { label: 'Patient ID', value: patientInfo.PatientID || 'N/A' },
      { label: 'Patient Name', value: formattedName },
      { label: 'Date of Birth', value: this.formatDateOfBirth(patientInfo.DateOfBirth) || 'N/A' },
      { label: 'Gender', value: this.formatGender(patientInfo.AdministrativeSex) || 'N/A' },
      { label: 'Identifier List', value: patientInfo.PatientIdentifierList || 'N/A' }
    ];

    let html = `
      <div class="patient-details-grid">
        ${patientDetails.map(detail => `
          <div class="detail-item">
            <div class="detail-label">${detail.label}</div>
            <div class="detail-value">${detail.value}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Add report comments if available - spans full width at bottom
    if (reportComments.length > 0) {
      html += `
        <div class="report-comments-section">
          <div class="report-comments-header">Report Comments</div>
          <div class="report-comments-content">
            ${reportComments.map(comment => `
              <div class="comment-item">${comment.Comment || 'N/A'}</div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  renderLabInfo() {
    const msh = this.data.MSH || {};
    const container = document.getElementById('lab-info');
    
    if (!container) {
      console.error('lab-info container not found');
      return;
    }
    
    const formattedDateTime = this.formatDateTime(msh.DateTime);
    
    const labDetails = [
      { label: 'Sending Facility', value: msh.SendingFacility || 'N/A' },
      { label: 'Sending Application', value: msh.SendingApp || 'N/A' },
      { label: 'Report Date/Time', value: formattedDateTime },
      { label: 'Message Control ID', value: msh.MessageControlID || 'N/A' },
      { label: 'Processing ID', value: msh.ProcessingID || 'N/A' },
      { label: 'Version', value: msh.Version || 'N/A' }
    ];

    const html = labDetails.map(detail => `
      <div class="detail-item">
        <div class="detail-label">${detail.label}</div>
        <div class="detail-value">${detail.value}</div>
      </div>
    `).join('');
    
    container.innerHTML = html;
  }

  renderOBRInfo() {
    const container = document.getElementById('obr-info');
    
    if (!container) {
      console.error('obr-info container not found');
      return;
    }
    
    if (!this.data || !this.data.OBR) {
      container.innerHTML = '<div class="no-results">No lab order information available</div>';
      return;
    }
    
    const obrSegments = Array.isArray(this.data.OBR) ? this.data.OBR : [this.data.OBR];
    
    if (obrSegments.length === 0) {
      container.innerHTML = '<div class="no-results">No lab order information available</div>';
      return;
    }

    let html = '';
    
    obrSegments.forEach((obr, index) => {
      const obrDetails = [
        { label: 'Placer Order Number', value: obr.PlacerOrderNumber || 'N/A' },
        { label: 'Filler Order Number', value: obr.FillerOrderNumber || 'N/A' },
        { label: 'Universal Service ID', value: this.parseServiceIdentifier(obr.UniversalServiceIdentifier) },
        { label: 'Universal Service ID Component 5', value: obr.UniversalServiceIdentifierComponent5 || 'N/A' },
        { label: 'Priority', value: obr.Priority || 'N/A' },
        { label: 'Requested Date/Time', value: this.formatDateTime(obr.RequestedDateTime) },
        { label: 'Observation Date/Time', value: this.formatDateTime(obr.ObservationDateTime) },
        { label: 'Results Report Status Change Date/Time', value: this.formatDateTime(obr.ResultsRptStatusChngDateTime) || 'N/A' },
        { label: 'Result Status', value: obr.ResultStatus || 'N/A' },
        { label: 'Specimen Source', value: obr.SpecimenSource || 'N/A' },
        { label: 'Ordering Provider', value: this.parseProviderName(obr.OrderingProvider) },
        { label: 'Diagnostic Service Section', value: obr.DiagnosticServSectID || 'N/A' },
        { label: 'Collection Volume', value: obr.CollectionVolume || 'N/A' }
      ];

      if (obrSegments.length > 1) {
        html += `<div class="obr-section-header">Lab Order ${index + 1}</div>`;
      }

      html += obrDetails.map(detail => `
        <div class="detail-item">
          <div class="detail-label">${detail.label}</div>
          <div class="detail-value">${detail.value}</div>
        </div>
      `).join('');
    });
    
    container.innerHTML = html;
  }

  parseServiceIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return 'N/A';
    try {
      const parts = identifier.split('^');
      if (parts.length >= 2) {
        return `${parts[1]} (${parts[0]})`;
      }
      return identifier;
    } catch (error) {
      console.error('Error parsing service identifier:', error);
      return identifier || 'N/A';
    }
  }

  parseProviderName(provider) {
    if (!provider || typeof provider !== 'string') return 'N/A';
    try {
      const parts = provider.split('^');
      if (parts.length >= 3) {
        return `${parts[2]} ${parts[1]}`.trim();
      } else if (parts.length >= 2) {
        return `${parts[1]} ${parts[0]}`.trim();
      }
      return provider;
    } catch (error) {
      console.error('Error parsing provider name:', error);
      return provider || 'N/A';
    }
  }

  renderTestResults() {
    const container = document.getElementById('test-results');
    
    if (!container) {
      console.error('test-results container not found');
      return;
    }
    
    if (!this.data) {
      container.innerHTML = '<div class="no-results">No data loaded</div>';
      return;
    }
    
    const allTests = this.getAllTests();
    
    if (allTests.length === 0) {
      container.innerHTML = '<div class="no-results">No test results found</div>';
      return;
    }
    
    container.innerHTML = allTests.map(test => this.createTestCard(test)).join('');
  }

  getAllTests() {
    const tests = [];
    
    try {
      if (this.data.OBR && Array.isArray(this.data.OBR)) {
        this.data.OBR.forEach((obr) => {
          if (obr.OBX && Array.isArray(obr.OBX)) {
            obr.OBX.forEach((obx) => {
              const testData = {
                ...obx,
                orderInfo: {
                  observationDateTime: obr.ObservationDateTime,
                  orderingProvider: obr.OrderingProvider,
                  universalServiceIdentifier: obr.UniversalServiceIdentifier
                }
              };
              tests.push(testData);
            });
          }
        });
      } else {
        // Check if there are standalone OBX segments
        if (this.data.OBX && Array.isArray(this.data.OBX)) {
          this.data.OBX.forEach((obx) => {
            tests.push({
              ...obx,
              orderInfo: {
                observationDateTime: 'N/A',
                orderingProvider: 'N/A',
                universalServiceIdentifier: 'N/A'
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('Error parsing tests:', error);
    }
    
    return tests;
  }

  createTestCard(test) {
    const testName = this.parseTestName(test.ObservationIdentifier);
    const testValue = test.ObservationValue || 'No Result';
    const units = this.parseUnits(test.Units);
    const status = test.ObservationResultStatus || 'Unknown';
    const comment = this.getTestComment(test);
    
    const cardClass = this.getTestCardClass(testValue, comment);
    const statusClass = this.getStatusClass(status, testValue, comment);
    
    return `
      <div class="test-result-card ${cardClass}" data-test-type="${cardClass}">
        <div class="test-name">${testName}</div>
        <div class="test-details">
          <div class="test-detail">
            <div class="test-detail-label">Result</div>
            <div class="test-detail-value test-value">${testValue}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Units</div>
            <div class="test-detail-value">${units}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Reference Range</div>
            <div class="test-detail-value">${test.ReferencesRange || 'N/A'}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Abnormal Flags</div>
            <div class="test-detail-value">${test.AbnormalFlags || 'N/A'}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Complete name of analytes</div>
            <div class="test-detail-value">${test.ObservationSubIDComponent4 || 'N/A'}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Status</div>
            <div class="test-detail-value">
              <span class="test-status ${statusClass}">${this.formatStatus(status)}</span>
            </div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Performing Organization</div>
            <div class="test-detail-value">${this.parsePerformingOrganization(test.PerformingOrganizationName) || 'N/A'}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Performing Address</div>
            <div class="test-detail-value">${this.parsePerformingAddress(test.PerformingOrganizationAddress) || 'N/A'}</div>
          </div>
          <div class="test-detail">
            <div class="test-detail-label">Medical Director</div>
            <div class="test-detail-value">${this.parsePerformingDirector(test.PerformingOrganizationMedicalDirector) || 'N/A'}</div>
          </div>
        </div>
        ${comment ? `<div class="test-comment ${comment.includes('NON-COMPLIANT') ? 'comment-non-compliant' : ''}">${comment}</div>` : ''}
      </div>
    `;
  }

  getTestCardClass(value, comment) {
    if (comment && comment.includes('NON-COMPLIANT')) {
      return 'non-compliant';
    }
    
    if (value && (value.includes('<') || value === 'No Result')) {
      return 'negative';
    }
    
    if (value && !value.includes('<') && value !== 'N/A' && value !== 'No Result' && !isNaN(parseFloat(value))) {
      return 'positive';
    }
    
    return 'negative';
  }

  getStatusClass(status, value, comment) {
    if (comment && comment.includes('NON-COMPLIANT')) {
      return 'status-positive';
    }
    
    if (value && (value.includes('<') || value === 'No Result')) {
      return 'status-negative';
    }
    
    return 'status-final';
  }

  getTestComment(test) {
    if (test.NTE && Array.isArray(test.NTE) && test.NTE.length > 0) {
      // Join all comments with a separator for multiple NTE segments
      return test.NTE.map(note => note.Comment || '').filter(comment => comment.trim()).join(' | ');
    }
    return '';
  }

  parseTestName(identifier) {
    if (!identifier || typeof identifier !== 'string') return 'Unknown Test';
    
    try {
      // Parse format: "X00161^Oxycodone Sal CMP^L^OXYCODONE^Oxycodone^L"
      const parts = identifier.split('^');
      if (parts.length >= 2) {
        return parts[1] || parts[0];
      }
      
      return identifier;
    } catch (error) {
      console.error('Error parsing test name:', error);
      return identifier || 'Unknown Test';
    }
  }

  parseUnits(units) {
    if (!units || typeof units !== 'string') return 'N/A';
    
    try {
      // Parse format: "ng/mL^ng/mL^ISO"
      const parts = units.split('^');
      return parts[0] || units;
    } catch (error) {
      console.error('Error parsing units:', error);
      return units || 'N/A';
    }
  }

  formatStatus(status) {
    const statusMap = {
      'F': 'Final',
      'P': 'Preliminary',
      'C': 'Corrected',
      'X': 'Cancelled'
    };
    
    return statusMap[status] || status;
  }

  formatPatientName(name) {
    if (!name || typeof name !== 'string') {
      return 'N/A';
    }
    
    try {
      // Parse format: "Smith^Jane"
      const parts = name.split('^');
      
      if (parts.length >= 2) {
        return `${parts[1]} ${parts[0]}`;
      }
      
      return name;
    } catch (error) {
      console.error('Error formatting patient name:', error);
      return name || 'N/A';
    }
  }

  formatGender(gender) {
    if (!gender || typeof gender !== 'string') {
      return 'N/A';
    }
    
    // Convert common HL7 gender codes to readable format
    const genderMap = {
      'M': 'Male',
      'F': 'Female',
      'O': 'Other',
      'U': 'Unknown',
      'A': 'Ambiguous',
      'N': 'Not applicable'
    };
    
    const upperGender = gender.toUpperCase().trim();
    return genderMap[upperGender] || gender;
  }

  formatDateOfBirth(dateOfBirth) {
    if (!dateOfBirth || typeof dateOfBirth !== 'string') return 'N/A';
    
    try {
      // Parse HL7 date format: "YYYYMMDD" or "YYYYMMDDHHMMSS"
      if (dateOfBirth.length >= 8) {
        const year = dateOfBirth.substring(0, 4);
        const month = dateOfBirth.substring(4, 6);
        const day = dateOfBirth.substring(6, 8);
        
        // Validate the date components
        if (year && month && day) {
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime())) {
            // Format as MM/DD/YYYY
            const formattedMonth = month.padStart(2, '0');
            const formattedDay = day.padStart(2, '0');
            return `${formattedMonth}/${formattedDay}/${year}`;
          }
        }
      }
      
      // If shorter format, try to parse what we have
      if (dateOfBirth.length >= 6) {
        const year = dateOfBirth.substring(0, 4);
        const month = dateOfBirth.substring(4, 6);
        if (year && month) {
          const formattedMonth = month.padStart(2, '0');
          return `${formattedMonth}/${year}`;
        }
      }
      
      return dateOfBirth; // Return as-is if we can't parse
    } catch (error) {
      console.error('Error formatting date of birth:', error);
      return dateOfBirth || 'N/A';
    }
  }

  formatDateTime(dateTime) {
    if (!dateTime || typeof dateTime !== 'string') return 'N/A';
    
    try {
      // Parse format: "20250611154528"
      if (dateTime.length >= 14) {
        const year = dateTime.substring(0, 4);
        const month = dateTime.substring(4, 6);
        const day = dateTime.substring(6, 8);
        const hour = dateTime.substring(8, 10);
        const minute = dateTime.substring(10, 12);
        const second = dateTime.substring(12, 14);
        
        const date = new Date(year, month - 1, day, hour, minute, second);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      }
      
      return dateTime;
    } catch (error) {
      console.error('Error formatting date time:', error);
      return dateTime || 'N/A';
    }
  }

  parsePerformingOrganization(orgField) {
    if (!orgField || typeof orgField !== 'string') return 'N/A';
    
    try {
      // Parse format: "Aegis Sciences Corporation^^^^^CLIA&2.16.840.1.113883.3.8748&ISO^XX^^^44D1083455"
      const parts = orgField.split('^');
      const orgName = parts[0] || '';
      const cliaId = parts.length > 9 ? parts[9] : '';
      
      if (orgName && cliaId) {
        return `${orgName} (CLIA: ${cliaId})`;
      } else if (orgName) {
        return orgName;
      }
      
      return orgField;
    } catch (error) {
      console.error('Error parsing performing organization:', error);
      return orgField || 'N/A';
    }
  }

  parsePerformingAddress(addressField) {
    if (!addressField || typeof addressField !== 'string') return 'N/A';
    
    try {
      // Parse format: "530 Great Circle Road^^Nashville^TN^37228"
      const parts = addressField.split('^');
      const street = parts[0] || '';
      const city = parts[2] || '';
      const state = parts[3] || '';
      const zip = parts[4] || '';
      
      const addressParts = [street, city, state, zip].filter(part => part.trim());
      return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    } catch (error) {
      console.error('Error parsing performing address:', error);
      return addressField || 'N/A';
    }
  }

  parsePerformingDirector(directorField) {
    if (!directorField || typeof directorField !== 'string') return 'N/A';
    
    try {
      // Parse format: "^Jeter^Elaine^K^MD"
      const parts = directorField.split('^');
      const lastName = parts[1] || '';
      const firstName = parts[2] || '';
      const middleName = parts[3] || '';
      const suffix = parts[4] || '';
      
      const nameParts = [firstName, middleName, lastName, suffix].filter(part => part.trim());
      return nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
    } catch (error) {
      console.error('Error parsing performing director:', error);
      return directorField || 'N/A';
    }
  }

  filterResults(filter) {
    const cards = document.querySelectorAll('.test-result-card');
    
    cards.forEach(card => {
      const testType = card.dataset.testType;
      let show = false;
      
      switch (filter) {
        case 'all':
          show = true;
          break;
        case 'positive':
          show = testType === 'positive';
          break;
        case 'negative':
          show = testType === 'negative';
          break;
        case 'non-compliant':
          show = testType === 'non-compliant';
          break;
      }
      
      if (show) {
        card.style.display = 'block';
        card.style.animation = 'fadeIn 0.3s ease-in';
      } else {
        card.style.display = 'none';
      }
    });
  }


  initializeCollapsibleSections() {
    // Add toggle buttons to section headers
    this.addToggleButtons();
    
    // Load saved collapse states or set defaults
    this.loadCollapsedStates();
    
    // Setup event listeners for toggle buttons
    this.setupToggleListeners();
  }

  addToggleButtons() {
    const sections = [
      { selector: '.patient-info-card h2', contentSelector: '.patient-details', key: 'patient' },
      { selector: '.lab-info-card h2', contentSelector: '.lab-details', key: 'lab' },
      { selector: '.obr-info-card h2', contentSelector: '.obr-details', key: 'obr' },
      { selector: '.results-section h2', contentSelector: '.results-tabs, .test-results-grid', key: 'results' },
      { selector: '.compliance-summary h2', contentSelector: '.compliance-details', key: 'compliance' }
    ];

    sections.forEach(section => {
      const header = document.querySelector(section.selector);
      if (header && !header.querySelector('.toggle-btn')) {
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        
        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.innerHTML = '−'; // Start expanded
        toggleBtn.style.cssText = `
          font-size: 18px;
          font-weight: bold;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          transition: transform 0.2s ease;
        `;
        
        header.appendChild(toggleBtn);
      }
    });
  }

  setupToggleListeners() {
    const sections = [
      { selector: '.patient-info-card h2', contentSelector: '.patient-details', key: 'patient' },
      { selector: '.lab-info-card h2', contentSelector: '.lab-details', key: 'lab' },
      { selector: '.obr-info-card h2', contentSelector: '.obr-details', key: 'obr' },
      { selector: '.results-section h2', contentSelector: '.results-tabs, .test-results-grid', key: 'results' },
      { selector: '.compliance-summary h2', contentSelector: '.compliance-details', key: 'compliance' }
    ];

    sections.forEach(section => {
      const header = document.querySelector(section.selector);
      if (header) {
        header.addEventListener('click', () => this.toggleSection(section.key, section.contentSelector));
      }
    });
  }

  toggleSection(sectionKey, contentSelector) {
    const elements = document.querySelectorAll(contentSelector);
    const toggleBtn = document.querySelector(`.${sectionKey}-info-card .toggle-btn, .${sectionKey === 'results' ? 'results-section' : sectionKey === 'compliance' ? 'compliance-summary' : sectionKey + '-info-card'} .toggle-btn`);
    
    let isCollapsed = false;
    elements.forEach(element => {
      if (element.style.display === 'none') {
        element.style.display = '';
        isCollapsed = false;
      } else {
        element.style.display = 'none';
        isCollapsed = true;
      }
    });

    // Update toggle button
    if (toggleBtn) {
      toggleBtn.innerHTML = isCollapsed ? '+' : '−';
      toggleBtn.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(0deg)';
    }

    // Save state
    this.saveCollapsedState(sectionKey, isCollapsed);
  }

  loadCollapsedStates() {
    const sections = ['patient', 'lab', 'obr', 'results', 'compliance'];
    
    sections.forEach(sectionKey => {
      const saved = localStorage.getItem(`section-${sectionKey}-collapsed`);
      if (saved === 'true') {
        const contentSelector = this.getContentSelector(sectionKey);
        const elements = document.querySelectorAll(contentSelector);
        const toggleBtn = document.querySelector(`.${sectionKey === 'results' ? 'results-section' : sectionKey === 'compliance' ? 'compliance-summary' : sectionKey + '-info-card'} .toggle-btn`);
        
        elements.forEach(element => {
          element.style.display = 'none';
        });
        
        if (toggleBtn) {
          toggleBtn.innerHTML = '+';
        }
      }
    });
  }

  getContentSelector(sectionKey) {
    const selectors = {
      'patient': '.patient-details',
      'lab': '.lab-details', 
      'obr': '.obr-details',
      'results': '.results-tabs, .test-results-grid',
      'compliance': '.compliance-details'
    };
    return selectors[sectionKey];
  }

  saveCollapsedState(sectionKey, isCollapsed) {
    localStorage.setItem(`section-${sectionKey}-collapsed`, isCollapsed.toString());
  }
}

// Add CSS animation for filter transitions
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

// Global variable to store the viewer instance
let labResultsViewer = null;

// Create global functions immediately (before DOM load) for FileMaker compatibility
// These functions will work even if called before the viewer is fully initialized

// Global function for FileMaker to load HL7 data
window.loadLabResults = function(hl7Data) {
  
  // Wait for initialization if needed
  if (!labResultsViewer) {
    
    // Try to wait for up to 5 seconds for initialization
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds with 100ms intervals
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (labResultsViewer) {
          clearInterval(checkInterval);
          resolve(window.loadLabResults(hl7Data));
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          resolve({ success: false, error: 'Timeout: Viewer not initialized within 5 seconds' });
        }
      }, 100);
    });
  }
  
  // Add visual feedback immediately
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const resultsEl = document.getElementById('results-container');
  
  if (loadingEl) {
    loadingEl.innerHTML = '<p>🔄 Processing FileMaker data...</p>';
    loadingEl.classList.remove('hidden');
  }
  if (errorEl) errorEl.classList.add('hidden');
  if (resultsEl) resultsEl.classList.add('hidden');
  
  try {
    // Handle common FileMaker escaping issues
    let cleanedData = hl7Data;
    if (typeof hl7Data === 'string') {
      // Un-escape common FileMaker escaping and handle pilcrow character
      cleanedData = hl7Data
        .replace(/¶/g, '\n')       // Convert FileMaker pilcrow to newlines (direct)
        .replace(/\\n/g, '\n')     // Convert escaped newlines (from Quote())
        .replace(/\\r/g, '\r')     // Convert escaped carriage returns  
        .replace(/\\"/g, '"')      // Convert escaped quotes
        .replace(/\\\\/g, '\\');   // Convert escaped backslashes
      
    }
    
    const result = labResultsViewer.loadHL7Data(cleanedData);
    return result;
  } catch (error) {
    const errorMsg = 'Error in FileMaker integration: ' + error.message;
    if (loadingEl) {
      loadingEl.innerHTML = '<p>❌ ' + errorMsg + '</p>';
    }
    return { success: false, error: errorMsg };
  }
};

// Global function to clear/reset the interface
window.clearLabResults = function() {
  if (labResultsViewer) {
    labResultsViewer.showLoading();
    labResultsViewer.data = null;
    return { success: true, message: 'Interface cleared' };
  } else {
    return { success: false, error: 'Viewer not initialized yet - please wait and try again' };
  }
};

// Global function to get current status
window.getLabResultsStatus = function() {
  if (labResultsViewer) {
    return {
      success: true,
      hasData: !!labResultsViewer.data,
      testCount: labResultsViewer.data?.OBR?.reduce((count, obr) => count + (obr.OBX?.length || 0), 0) || 0
    };
  } else {
    return { success: false, error: 'Viewer not initialized yet - please wait and try again' };
  }
};

// Global function to check if the viewer is ready
window.isLabResultsReady = function() {
  return !!labResultsViewer;
};

// Global function to test PDF functionality with sample data
window.testPDFButton = function() {
  if (!labResultsViewer) {
    console.error('Lab results viewer not initialized');
    return;
  }

  // Load the sample HL7 data
  return fetch('./src/result.hl7')
    .then(response => response.text())
    .then(hl7Content => {
      window.loadLabResults(hl7Content);
      console.log('Sample data loaded - PDF button should now be visible');
      console.log('PDF Data available:', !!labResultsViewer.data?.PDFData);
      return { success: true, hasPDF: !!labResultsViewer.data?.PDFData };
    })
    .catch(error => {
      console.error('Error loading test data:', error);
      return { success: false, error: error.message };
    });
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (!labResultsViewer) {
    labResultsViewer = new LabResultsViewer();
    
    // Notify that we're ready
    window.labResultsReady = true;
  }
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading, the DOMContentLoaded event will handle initialization
} else {
  if (!labResultsViewer) {
    labResultsViewer = new LabResultsViewer();
    window.labResultsReady = true;
  }
}
