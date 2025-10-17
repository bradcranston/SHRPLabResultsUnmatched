// HL7 Parser for Lab Results
class HL7Parser {
  constructor() {
    this.segments = {};
    this.parsedData = {};
  }

  async parseHL7File(filePath) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load HL7 file: ${response.status}`);
      }
      const hl7Content = await response.text();
      
      return this.parseHL7String(hl7Content);
    } catch (error) {
      console.error('Error loading HL7 file:', error);
      throw new Error(`Error loading HL7 file: ${error.message}`);
    }
  }

  parseHL7String(hl7Content) {
    const lines = hl7Content.split('\n').filter(line => line.trim());
    
    // Initialize parsed data structure
    this.parsedData = {
      MSH: {},
      PID: {},
      NTE: [], // Store report comments (NTE segments after PID)
      OBR: [],
      OBX: [],
      PDFData: null // Store PDF base64 data if found
    };

    let currentOBR = null;
    let currentOBX = null;
    let pendingNotes = []; // Store notes that come before OBX segments
    let lastSegmentType = null; // Track the previous segment type

    lines.forEach((line) => {
      const segmentType = line.substring(0, 3);
      
      switch (segmentType) {
        case 'MSH':
          this.parsedData.MSH = this.parseMSH(line);
          lastSegmentType = 'MSH';
          break;
        case 'PID':
          this.parsedData.PID = this.parsePID(line);
          lastSegmentType = 'PID';
          break;
        case 'ORC':
          // Skip ORC segments for now, they're order control segments
          lastSegmentType = 'ORC';
          break;
        case 'OBR': {
          currentOBR = this.parseOBR(line);
          currentOBR.OBX = [];
          this.parsedData.OBR.push(currentOBR);
          // Clear any pending notes as they were for previous segments
          pendingNotes = [];
          lastSegmentType = 'OBR';
          break;
        }
        case 'OBX': {
          currentOBX = this.parseOBX(line);
          // Add any pending notes to this OBX
          if (pendingNotes.length > 0) {
            currentOBX.NTE = [...pendingNotes];
            pendingNotes = [];
          }
          if (currentOBR) {
            currentOBR.OBX.push(currentOBX);
          } else {
            this.parsedData.OBX.push(currentOBX);
          }
          lastSegmentType = 'OBX';
          break;
        }
        case 'NTE': {
          const note = this.parseNTE(line);
          if (lastSegmentType === 'PID') {
            // This note comes after PID - it's a report comment
            this.parsedData.NTE.push(note);
          } else if (currentOBX) {
            // This note belongs to the current OBX
            if (!currentOBX.NTE) currentOBX.NTE = [];
            currentOBX.NTE.push(note);
          } else {
            // This note comes before an OBX, store it for later
            pendingNotes.push(note);
          }
          break;
        }
      }
    });

    
    return this.parsedData;
  }

  parseMSH(line) {
    const fields = this.splitHL7Line(line);
    
    const mshData = {
      FieldSeparator: fields[1] || '',
      EncodingCharacters: fields[2] || '',
      SendingApp: fields[3] || '',
      SendingFacility: fields[4] || '',
      ReceivingApp: fields[5] || '',
      ReceivingFacility: fields[6] || '',
      DateTime: fields[7] || '',
      Security: fields[8] || '',
      MessageType: fields[9] || '',
      MessageControlID: fields[10] || '',
      ProcessingID: fields[11] || '',
      Version: fields[12] || ''
    };
    
    return mshData;
  }

  parsePID(line) {
    const fields = this.splitHL7Line(line);
    
    // Log specific field values we care about
    
    const pidData = {
      SetID: fields[1] || '',
      PatientID: fields[2] || '',
      PatientIdentifierList: fields[3] || '',
      AlternatePatientID: fields[4] || '',
      PatientName: fields[5] || '',
      MothersMaidenName: fields[6] || '',
      DateOfBirth: fields[7] || '',
      AdministrativeSex: fields[8] || '',
      PatientAlias: fields[9] || '',
      Race: fields[10] || '',
      PatientAddress: fields[11] || '',
      CountyCode: fields[12] || '',
      PhoneNumberHome: fields[13] || '',
      PhoneNumberBusiness: fields[14] || '',
      PrimaryLanguage: fields[15] || '',
      MaritalStatus: fields[16] || '',
      Religion: fields[17] || '',
      PatientAccountNumber: fields[18] || '',
      SSNNumber: fields[19] || '',
      DriversLicenseNumber: fields[20] || '',
      MothersIdentifier: fields[21] || '',
      EthnicGroup: fields[22] || '',
      BirthPlace: fields[23] || '',
      MultipleBirthIndicator: fields[24] || '',
      BirthOrder: fields[25] || '',
      Citizenship: fields[26] || '',
      VeteransMilitaryStatus: fields[27] || '',
      Nationality: fields[28] || '',
      PatientDeathDateTime: fields[29] || '',
      PatientDeathIndicator: fields[30] || ''
    };
    
    return pidData;
  }

  parseOBR(line) {
    const fields = this.splitHL7Line(line);
    return {
      SetID: fields[1] || '',
      PlacerOrderNumber: fields[2] || '',
      FillerOrderNumber: this.extractOrderNumber(fields[3]) || '',
      UniversalServiceIdentifier: fields[4] || '',
      UniversalServiceIdentifierComponent5: this.extractComponent(fields[4], 5) || '',
      Priority: fields[5] || '',
      RequestedDateTime: fields[6] || '',
      ObservationDateTime: fields[7] || '',
      ObservationEndDateTime: fields[8] || '',
      CollectionVolume: fields[9] || '',
      CollectorIdentifier: fields[10] || '',
      SpecimenActionCode: fields[11] || '',
      DangerCode: fields[12] || '',
      RelevantClinicalInformation: fields[13] || '',
      SpecimenReceivedDateTime: fields[14] || '',
      SpecimenSource: fields[15] || '',
      OrderingProvider: fields[16] || '',
      OrderCallbackPhoneNumber: fields[17] || '',
      PlacerField1: fields[18] || '',
      PlacerField2: fields[19] || '',
      FillerField1: fields[20] || '',
      FillerField2: fields[21] || '',
      ResultsRptStatusChngDateTime: fields[22] || '',
      ChargeToPractice: fields[23] || '',
      DiagnosticServSectID: fields[24] || '',
      ResultStatus: fields[25] || '',
      ParentResult: fields[26] || '',
      QuantityTiming: fields[27] || '',
      ResultCopiesTo: fields[28] || '',
      Parent: fields[29] || '',
      TransportationMode: fields[30] || '',
      ReasonForStudy: fields[31] || '',
      PrincipalResultInterpreter: fields[32] || '',
      AssistantResultInterpreter: fields[33] || '',
      Technician: fields[34] || '',
      Transcriptionist: fields[35] || '',
      ScheduledDateTime: fields[36] || '',
      NumberOfSampleContainers: fields[37] || '',
      TransportLogisticsOfCollectedSample: fields[38] || '',
      CollectorComment: fields[39] || '',
      TransportArrangementResponsibility: fields[40] || '',
      TransportArranged: fields[41] || '',
      EscortRequired: fields[42] || '',
      PlannedPatientTransportComment: fields[43] || ''
    };
  }

  parseOBX(line) {
    const fields = this.splitHL7Line(line);
    
    const obx = {
      SetID: fields[1] || '',
      ValueType: fields[2] || '',
      ObservationIdentifier: fields[3] || '',
      ObservationSubID: fields[4] || '',
      ObservationSubIDComponent4: this.extractComponent(fields[4], 4) || '',
      ObservationValue: fields[5] || '',
      Units: fields[6] || '',
      ReferencesRange: fields[7] || '',
      AbnormalFlags: fields[8] || '',
      Probability: fields[9] || '',
      NatureOfAbnormalTest: fields[10] || '',
      ObservationResultStatus: fields[11] || '',
      DateLastObsNormalValues: fields[12] || '',
      UserDefinedAccessChecks: fields[13] || '',
      DateTimeOfObservation: fields[14] || '',
      ProducersID: fields[15] || '',
      ResponsibleObserver: fields[16] || '',
      ObservationMethod: fields[17] || '',
      PerformingOrganization: fields[23] || '',  // Field 23 contains performing organization info
      PerformingOrganizationAddress: fields[24] || '',  // Field 24 contains organization address
      MedicalDirector: fields[25] || '',  // Field 25 contains medical director info
      // Parsed versions for display
      PerformingOrganizationName: this.parsePerformingOrganization(fields[23]),
      PerformingOrganizationAddressParsed: this.parsePerformingOrganizationAddress(fields[24]),
      MedicalDirectorName: this.parseMedicalDirector(fields[25])
    };

    // Check if this is PDF data
    if (obx.ValueType === 'ED' && 
        obx.ObservationIdentifier && 
        obx.ObservationIdentifier.includes('PDF') &&
        obx.ObservationValue &&
        obx.ObservationValue.startsWith('AEGIS^Report^PDF^Base64^')) {
      
      // Extract base64 data after the prefix
      const base64Data = obx.ObservationValue.substring('AEGIS^Report^PDF^Base64^'.length);
      this.parsedData.PDFData = base64Data;
    }

    return obx;
  }

  parseNTE(line) {
    const fields = this.splitHL7Line(line);
    return {
      SetID: fields[1] || '',
      SourceOfComment: fields[2] || '',
      Comment: fields[3] || ''
    };
  }

  extractOrderNumber(orderField) {
    // Extract only the part before the first ^ character
    if (!orderField || typeof orderField !== 'string') {
      return '';
    }
    
    const firstCaretIndex = orderField.indexOf('^');
    if (firstCaretIndex === -1) {
      // No ^ found, return the whole string
      return orderField.trim();
    }
    
    // Return only the part before the first ^
    return orderField.substring(0, firstCaretIndex).trim();
  }

  extractComponent(field, componentNumber) {
    if (!field || typeof field !== 'string' || !componentNumber) {
      return '';
    }
    
    const components = field.split('^');
    if (componentNumber > components.length) {
      return '';
    }
    
    // Return the specified component (1-based indexing)
    return components[componentNumber - 1].trim();
  }

  // Helper function to parse performing organization from OBX field 15
  parsePerformingOrganization(organizationField) {
    if (!organizationField) return 'N/A';
    
    // Format: "Aegis Sciences Corporation^^^^^CLIA&2.16.840.1.113883.3.8748&ISO^XX^^^44D2062333"
    // The organization name is typically the first component
    const components = organizationField.split('^');
    return components[0] || 'N/A';
  }

  // Helper function to parse performing organization address from OBX field 16
  parsePerformingOrganizationAddress(addressField) {
    if (!addressField) return 'N/A';
    
    // Format: "501 Great Circle Road^^Nashville^TN^37228"
    const components = addressField.split('^');
    const street = components[0] || '';
    const city = components[2] || '';
    const state = components[3] || '';
    const zip = components[4] || '';
    
    let address = street;
    if (city) address += (address ? ', ' : '') + city;
    if (state) address += (address ? ', ' : '') + state;
    if (zip) address += (address ? ' ' : '') + zip;
    
    return address || 'N/A';
  }

  // Helper function to parse medical director from OBX field 17
  parseMedicalDirector(directorField) {
    if (!directorField) return 'N/A';
    
    // Format: "^Hardison^Matthew^T^PhD"
    const components = directorField.split('^');
    const lastName = components[1] || '';
    const firstName = components[2] || '';
    const middleName = components[3] || '';
    const suffix = components[4] || '';
    
    let name = '';
    if (firstName) name += firstName;
    if (middleName) name += (name ? ' ' : '') + middleName;
    if (lastName) name += (name ? ' ' : '') + lastName;
    if (suffix) name += (name ? ', ' : '') + suffix;
    
    return name || 'N/A';
  }

  splitHL7Line(line) {
    // HL7 typically uses | as field separator
    return line.split('|');
  }

  // Helper method to format the parsed data for the existing viewer
  formatForViewer() {
    return this.parsedData;
  }
}

export default HL7Parser;
