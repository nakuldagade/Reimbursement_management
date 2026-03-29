const axios = require('axios');

const getCountryCurrency = async (countryName) => {
  try {
    const response = await axios.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=currencies`
    );
    if (response.data && response.data.length > 0) {
      const currencies = response.data[0].currencies;
      const currencyCode = Object.keys(currencies)[0];
      return currencyCode || 'USD';
    }
    return 'INR';
  } catch (error) {
    console.error('Failed to fetch country currency:', error.message);
    return 'INR';
  }
};

module.exports = { getCountryCurrency };
