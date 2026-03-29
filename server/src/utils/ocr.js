const Tesseract = require('tesseract.js');

const parseReceipt = async (imagePath) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: () => {},
    });

    const result = {
      rawText: text,
      amount: null,
      date: null,
      vendor: null,
    };

    // Extract amount — look for currency patterns
    const amountPatterns = [
      /(?:total|amount|sum|due|paid)\s*:?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
      /\$\s*([\d,]+\.\d{2})/,
      /(?:USD|EUR|GBP|INR)\s*([\d,]+\.?\d{0,2})/i,
      /([\d,]+\.\d{2})\s*(?:total|due)/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
      /(\w{3,9}\s+\d{1,2},?\s+\d{4})/,
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        result.date = match[1];
        break;
      }
    }

    // Extract vendor — typically first non-empty line
    const lines = text.split('\n').filter((l) => l.trim().length > 2);
    if (lines.length > 0) {
      result.vendor = lines[0].trim();
    }

    return result;
  } catch (error) {
    console.error('OCR parsing error:', error.message);
    return { rawText: '', amount: null, date: null, vendor: null };
  }
};

module.exports = { parseReceipt };
