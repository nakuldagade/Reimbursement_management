const axios = require('axios');

const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return amount;

  try {
    const response = await axios.get(
      `https://open.er-api.com/v6/latest/${fromCurrency}`
    );

    if (response.data && response.data.rates && response.data.rates[toCurrency]) {
      const rate = response.data.rates[toCurrency];
      return parseFloat((amount * rate).toFixed(2));
    }

    console.error('Currency conversion failed: rate not found');
    return amount;
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    return amount;
  }
};

module.exports = { convertCurrency };
