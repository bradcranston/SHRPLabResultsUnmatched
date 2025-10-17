# FileMaker Line Break Handling Guide

## ✅ RECOMMENDED APPROACH: Let FileMaker Handle It Automatically

### Method 1: Use Quote() Function (Simplest)
```
# FileMaker automatically escapes line breaks when using Quote()
Set Variable [$hl7Data; Value: YourTable::YourHL7Field]

Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(" & Quote($hl7Data) & ")"
]
```

**How it works:**
- FileMaker's `Quote()` function automatically converts ¶ to `\n`
- JavaScript receives: `"MSH|data\\nPID|data\\nOBR|data"`
- Our code automatically converts `\\n` back to actual line breaks

### Method 2: Manual Substitution (If Quote() doesn't work)
```
# Manually replace ¶ with \n before passing to JavaScript
Set Variable [$hl7Data; Value: YourTable::YourHL7Field]
Set Variable [$cleanedData; Value: Substitute($hl7Data; ¶; "\n")]

Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(" & Quote($cleanedData) & ")"
]
```

### Method 3: Double Escaping (For problematic data)
```
# If your HL7 data has quotes or special characters
Set Variable [$hl7Data; Value: YourTable::YourHL7Field]
Set Variable [$cleanedData; Value: 
    Substitute($hl7Data; 
        ["\""; "\\\"";     # Escape quotes
         "\\"; "\\\\";     # Escape backslashes
         ¶; "\\n"]         # Convert line breaks
    )
]

Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(\"" & $cleanedData & "\")"
]
```

## 🧪 Test Which Method Works for You

### Test Script for FileMaker:
```
# Test Script - copy this into FileMaker

# Test Method 1: Quote() function
Set Variable [$hl7Data; Value: "MSH|test data" & ¶ & "PID|1|123||Smith^John"]

Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(" & Quote($hl7Data) & ")"
]

Set Variable [$result1; Value: Get(LastExternalFunctionResult)]
Show Custom Dialog ["Method 1 Result"; $result1]

# Test Method 2: Manual substitution
Set Variable [$cleanedData; Value: Substitute($hl7Data; ¶; "\n")]

Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(" & Quote($cleanedData) & ")"
]

Set Variable [$result2; Value: Get(LastExternalFunctionResult)]
Show Custom Dialog ["Method 2 Result"; $result2]
```

## 🔍 How to Tell If Your Line Breaks Are Working

### ✅ Success Indicators:
- Result contains: `"success":true`
- Patient information displays in the web viewer
- Multiple test results show up (indicating segments were properly separated)

### ❌ Failure Indicators:
- Result contains: `"No PID segment found"`
- Result contains: `"No OBR segments found"`
- Only one big blob of text in the interface
- Parser warnings about missing segments

## 🚀 Enhanced JavaScript Function (Already Implemented)

The JavaScript function already handles multiple line break formats:

```javascript
// Automatically handles:
cleanedData = hl7Data
  .replace(/\\n/g, '\n')     // FileMaker's Quote() escaping
  .replace(/\\r/g, '\r')     // Carriage returns
  .replace(/\\"/g, '"')      // Escaped quotes
  .replace(/\\\\/g, '\\');   // Escaped backslashes
```

## 📊 Comparison of Methods

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Quote() Function** | Simple, automatic escaping | May not work with all data | Most situations |
| **Manual Substitution** | Full control, reliable | More complex script | Complex HL7 data |
| **Double Escaping** | Handles special characters | Most complex | Problematic data |

## 🎯 My Recommendation

**Start with Method 1** (Quote() function):

```
Perform JavaScript in Web Viewer [
    Object Name: "labResultsWebViewer"
    Function: "window.loadLabResults(" & Quote(YourTable::YourHL7Field) & ")"
]
```

**If that doesn't work**, try Method 2 (Manual substitution):

```
Set Variable [$cleanedData; Value: Substitute(YourTable::YourHL7Field; ¶; "\n")]
Perform JavaScript in Web Viewer [
    Function: "window.loadLabResults(" & Quote($cleanedData) & ")"
]
```

## 🔧 Debugging Line Break Issues

### Check what JavaScript receives:
```
# Add this to see exactly what JavaScript gets:
Perform JavaScript in Web Viewer [
    Function: "console.log('Received data:', arguments[0]); window.loadLabResults(" & Quote($hl7Data) & ")"
]
```

### Check browser console:
Open browser developer tools (F12) and look for:
- `📥 hl7Content preview:` - Shows first 100 chars received
- `🔄 PID fields array:` - Shows how fields were split
- Any parsing warnings about missing segments

## 💡 Pro Tip

The JavaScript function logs everything it receives, so you can:
1. Open the web viewer in a browser
2. Open developer tools (F12)
3. Run your FileMaker script
4. Check the console to see exactly what data was received and how it was processed

This will tell you immediately if your line breaks are working correctly!

## 🎯 Bottom Line

**Try the simple Quote() method first** - it works in most cases and the JavaScript automatically handles the conversion. Only add manual substitution if you encounter issues with specific data.
