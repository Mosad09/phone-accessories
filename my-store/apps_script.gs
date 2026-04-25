const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // Update with your actual spreadsheet ID

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("orders");
    
    // Headers expected in 'orders' sheet:
    // [Email, Name, Phone, Governorate, City, Detailed Address, Items (JSON), Total, Status, CreatedAt]
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Email", "Name", "Phone", "Governorate", "City", "Detailed Address", "Items", "Total", "Status", "CreatedAt"]);
    }
    
    const row = [
      data.email || "",
      data.userName || "",
      data.phone || "",
      data.address?.governorate || "",
      data.address?.city || "",
      data.address?.detail || "",
      JSON.stringify(data.items || []),
      data.totalPrice || 0,
      data.status || "pending",
      data.createdAt || new Date().toISOString()
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Order placed" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const email = e.parameter.email;
    if (!email) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("orders");
    const data = sheet.getDataRange().getValues();
    
    // Assume row 1 is headers
    const headers = data[0];
    const emailIndex = headers.indexOf("Email");
    
    if (emailIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === email) {
        orders.push({
          email: data[i][emailIndex],
          userName: data[i][headers.indexOf("Name")],
          phone: data[i][headers.indexOf("Phone")],
          address: {
            governorate: data[i][headers.indexOf("Governorate")],
            city: data[i][headers.indexOf("City")],
            detail: data[i][headers.indexOf("Detailed Address")]
          },
          items: JSON.parse(data[i][headers.indexOf("Items")] || "[]"),
          totalPrice: data[i][headers.indexOf("Total")],
          status: data[i][headers.indexOf("Status")],
          createdAt: data[i][headers.indexOf("CreatedAt")]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(orders))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
