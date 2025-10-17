# FileMaker Integration Guide

## Function to Call from FileMaker

### `loadLabResults(hl7Data)`

This is the main function you need to call from FileMaker to load HL7 lab results data into the web viewer.

## Function Signature

```javascript
// From FileMaker, call this JavaScript function:
window.loadLabResults(hl7Data)
```

## Parameters

- **`hl7Data`** (string, required): The complete HL7 message as a string

## Return Value

Returns an object with success/error information:

```javascript
// Success case:
{
  success: true,
  message: "HL7 data loaded successfully"
}

// Error case:
{
  success: false,
  error: "Error message describing what went wrong"
}
```

## Available Functions

The web viewer provides these global functions for FileMaker:

1. **`window.loadLabResults(hl7Data)`** - Load HL7 data and display results
2. **`window.clearLabResults()`** - Clear the interface and reset to loading state  
3. **`window.getLabResultsStatus()`** - Get current status and data summary

## FileMaker Script Example

Here's how to call it from a FileMaker script:

### Method 1: Using Perform JavaScript in Web Viewer

```javascript
// In your FileMaker script, use "Perform JavaScript in Web Viewer"
// with this JavaScript code:

"window.loadLabResults(" & 
Quote ( YourHL7DataField ) & 
")"
```

### Method 2: Complete FileMaker Script Steps

```
# FileMaker Script Steps:

1. Set Variable [$hl7Data; Value: YourTable::HL7DataField]

2. Perform JavaScript in Web Viewer [
   Object Name: "labResultsWebViewer"; 
   Function: "window.loadLabResults(" & Quote($hl7Data) & ")"
]

3. Set Variable [$result; Value: Get(LastExternalFunctionResult)]

4. If [$result contains "success\":true"]
   # Success - data loaded
   Show Custom Dialog ["Success"; "Lab results loaded successfully"]
Else
   # Error occurred
   Show Custom Dialog ["Error"; "Failed to load lab results: " & $result]
End If
```

## Important Notes

### 1. Global Variable Access
The web viewer creates global functions that you access directly from FileMaker:
```javascript
window.loadLabResults(yourHL7String)        // Load data
window.clearLabResults()                    // Clear interface  
window.getLabResultsStatus()               // Get status
```

### 2. HL7 Data Format
- Pass the **complete HL7 message** as a single string
- Include all segments (MSH, PID, OBR, OBX, NTE, etc.)
- Preserve line breaks (use `\n` or `\r\n`)

### 3. Data Validation
The function automatically validates:
- HL7 content is a non-empty string
- Required segments are present (MSH, PID, OBR)
- Data structure is valid

### 4. Error Handling
- All errors are caught and returned in the result object
- Check the `success` property to determine if the operation succeeded
- Error details are available in the `error` property

## Example HL7 Data Structure

Your HL7 data should look like this:
```
MSH|^~\&|LIMS|AEGIS|CLOVERLEAF|28887|20250611154528||ORU^R01^ORU_R01|1749674728|P|2.5.1
PID|1|P123456789|882||Smith^Jane||19850721|F||2106-3^White^HL70005|123 MAIN ST^^IDAHO FALLS^ID^83404
OBR|1|123|40098089000^Aegis Sciences Corp^2.16.840.1.113883.3.8748^ISO|30000s^PainComp Medication Compliance
OBX|1|SN|X00161^Oxycodone Sal CMP^L^OXYCODONE^Oxycodone^L||<1|ng/mL^ng/mL^ISO|>=1|A|||F
NTE|1|O|NON-COMPLIANT: Test result indicates patient may not be taking drug prescribed.
```

## Testing Your Integration

1. **Use the debug button first**: Click "🔍 Load Test HL7 Data" to verify the interface works
2. **Check browser console**: Open developer tools to see detailed logging
3. **Verify return values**: Check the success/error response from your FileMaker script
4. **Test with your actual data**: Use your real HL7 data from FileMaker

## Troubleshooting

### Common Issues:

1. **"window.loadLabResults is undefined"**
   - Web viewer hasn't finished loading
   - Add a delay or check if the function exists first

2. **"Invalid HL7 data: Expected a string"**
   - Make sure you're passing a string, not an object
   - Check that the HL7 field isn't empty

3. **"No PID segment found"** 
   - HL7 data is missing required patient information
   - Verify your HL7 message structure

### Debug Script for FileMaker:

```javascript
// Test if the web viewer is ready:
"typeof window.loadLabResults !== 'undefined' ? 'ready' : 'not ready'"

// Test with sample data:
"window.loadLabResults('MSH|test\\nPID|1|123||TestName||19900101|M')"

// Check current status:
"window.getLabResultsStatus()"

// Clear the interface:
"window.clearLabResults()"
```

## Web Viewer Setup

Make sure your FileMaker web viewer:
1. **Points to the correct URL**: `http://localhost:8000` (or your server)
2. **Has a proper object name**: For referencing in scripts
3. **Allows JavaScript**: Web viewer settings must permit JavaScript execution
4. **Has sufficient size**: Make sure the web viewer is large enough to display results

The interface will automatically show patient information, lab details, and test results once the data is loaded successfully.
