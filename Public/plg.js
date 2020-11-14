// ==UserScript==
// @name        Steam Economy Enhancer1.3,1
// @icon        https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg
// @namespace   https://github.com/Nuklon
// @author      Nuklon
// @license     MIT
// @version     6.8.2
// @description Enhances the Steam Inventory and Steam Market.
// @include     *://steamcommunity.com/id/*/inventory*
// @include     *://steamcommunity.com/profiles/*/inventory*
// @include     *://steamcommunity.com/market*
// @include     *://steamcommunity.com/tradeoffer*
// @require     https://code.jquery.com/jquery-3.3.1.min.js
// @require     https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/async/2.6.0/async.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.1/localforage.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.js
// @grant       unsafeWindow
// ==/UserScript==
// jQuery is already added by Steam, force no conflict mode.
(function ($, async) {
  $.noConflict(true);
  const PAGE_MARKET = 0;
  const PAGE_MARKET_LISTING = 1;

  const COLOR_PRICE_FAIR = "#496424";
  const COLOR_PRICE_CHEAP = "#837433";
  const COLOR_PRICE_EXPENSIVE = "#813030";
  const COLOR_PRICE_NOT_CHECKED = "#26566c";

  const ERROR_SUCCESS = null;
  const ERROR_FAILED = 1;
  const ERROR_DATA = 2;

  var marketLists = [];

  var enableConsoleLog = false;

  var isLoggedIn =
    (typeof unsafeWindow.g_rgWalletInfo !== "undefined" &&
      unsafeWindow.g_rgWalletInfo != null) ||
    (typeof unsafeWindow.g_bLoggedIn !== "undefined" &&
      unsafeWindow.g_bLoggedIn);

  var currentPage = PAGE_MARKET;

  var market = new SteamMarket(
    unsafeWindow.g_rgAppContextData,
    typeof unsafeWindow.g_strInventoryLoadURL !== "undefined" &&
    unsafeWindow.g_strInventoryLoadURL != null
      ? unsafeWindow.g_strInventoryLoadURL
      : location.protocol + "//steamcommunity.com/my/inventory/json/",
    isLoggedIn ? unsafeWindow.g_rgWalletInfo : undefined
  );

  var currencyId =
    isLoggedIn &&
    market != null &&
    market.walletInfo != null &&
    market.walletInfo.wallet_currency != null
      ? market.walletInfo.wallet_currency
      : 3;

  var currencySymbol = unsafeWindow.GetCurrencySymbol(
    unsafeWindow.GetCurrencyCode(currencyId)
  );

  function SteamMarket(appContext, inventoryUrl, walletInfo) {
    this.appContext = appContext;
    this.inventoryUrl = inventoryUrl;
    this.walletInfo = walletInfo;
    this.inventoryUrlBase = inventoryUrl.replace("/inventory/json", "");
    if (!this.inventoryUrlBase.endsWith("/")) this.inventoryUrlBase += "/";
  }

  //#region Settings
  const SETTING_MIN_NORMAL_PRICE = "SETTING_MIN_NORMAL_PRICE";
  const SETTING_MAX_NORMAL_PRICE = "SETTING_MAX_NORMAL_PRICE";
  const SETTING_MIN_FOIL_PRICE = "SETTING_MIN_FOIL_PRICE";
  const SETTING_MAX_FOIL_PRICE = "SETTING_MAX_FOIL_PRICE";
  const SETTING_MIN_MISC_PRICE = "SETTING_MIN_MISC_PRICE";
  const SETTING_MAX_MISC_PRICE = "SETTING_MAX_MISC_PRICE";
  const SETTING_PRICE_OFFSET = "SETTING_PRICE_OFFSET";
  const SETTING_PRICE_MIN_CHECK_PRICE = "SETTING_PRICE_MIN_CHECK_PRICE";
  const SETTING_PRICE_ALGORITHM = "SETTING_PRICE_ALGORITHM";
  const SETTING_PRICE_IGNORE_LOWEST_Q = "SETTING_PRICE_IGNORE_LOWEST_Q";
  const SETTING_PRICE_HISTORY_HOURS = "SETTING_PRICE_HISTORY_HOURS";
  const SETTING_LAST_CACHE = "SETTING_LAST_CACHE";
  const SETTING_RELIST_AUTOMATICALLY = "SETTING_RELIST_AUTOMATICALLY";
  const SETTING_MARKET_PAGE_COUNT = "SETTING_MARKET_PAGE_COUNT";

  var settingDefaults = {
    SETTING_MIN_NORMAL_PRICE: 0.05,
    SETTING_MAX_NORMAL_PRICE: 2.5,
    SETTING_MIN_FOIL_PRICE: 0.15,
    SETTING_MAX_FOIL_PRICE: 10,
    SETTING_MIN_MISC_PRICE: 0.05,
    SETTING_MAX_MISC_PRICE: 10,
    SETTING_PRICE_OFFSET: 0.0,
    SETTING_PRICE_MIN_CHECK_PRICE: 0.0,
    SETTING_PRICE_ALGORITHM: 1,
    SETTING_PRICE_IGNORE_LOWEST_Q: 1,
    SETTING_PRICE_HISTORY_HOURS: 12,
    SETTING_INVENTORY_PRICE_LABELS: 1,
    SETTING_TRADEOFFER_PRICE_LABELS: 1,
    SETTING_LAST_CACHE: 0,
    SETTING_RELIST_AUTOMATICALLY: 0,
    SETTING_MARKET_PAGE_COUNT: 100,
  };

  function getSettingWithDefault(name) {
    return (
      getLocalStorageItem(name) ||
      (name in settingDefaults ? settingDefaults[name] : null)
    );
  }

  function setSetting(name, value) {
    setLocalStorageItem(name, value);
  }

  var storagePersistent = localforage.createInstance({
    name: "see_persistent",
  });

  var storageSession;

  var currentUrl = new URL(window.location.href);
  var noCache = currentUrl.searchParams.get("no-cache") != null;

  // This does not work the same as the 'normal' session storage because opening a new browser session/tab will clear the cache.
  // For this reason, a rolling cache is used.
  if (getSessionStorageItem("SESSION") == null || noCache) {
    var lastCache = getSettingWithDefault(SETTING_LAST_CACHE);
    if (lastCache > 5) lastCache = 0;

    setSetting(SETTING_LAST_CACHE, lastCache + 1);

    storageSession = localforage.createInstance({
      name: "see_session_" + lastCache,
    });

    storageSession.clear(); // Clear any previous data.
    setSessionStorageItem("SESSION", lastCache);
  } else {
    storageSession = localforage.createInstance({
      name: "see_session_" + getSessionStorageItem("SESSION"),
    });
  }

  function getLocalStorageItem(name) {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      return null;
    }
  }

  function setLocalStorageItem(name, value) {
    try {
      localStorage.setItem(name, value);
      return true;
    } catch (e) {
      logConsole("Failed to set local storage item " + name + ", " + e + ".");
      return false;
    }
  }

  function getSessionStorageItem(name) {
    try {
      return sessionStorage.getItem(name);
    } catch (e) {
      return null;
    }
  }

  function setSessionStorageItem(name, value) {
    try {
      sessionStorage.setItem(name, value);
      return true;
    } catch (e) {
      logConsole("Failed to set session storage item " + name + ", " + e + ".");
      return false;
    }
  }
  //#endregion
  function getPriceInformationFromItem(item) {
    var isTradingCard = getIsTradingCard(item);
    var isFoilTradingCard = getIsFoilTradingCard(item);
    return getPriceInformation(isTradingCard, isFoilTradingCard);
  }

  function getPriceInformation(isTradingCard, isFoilTradingCard) {
    var maxPrice = 0;
    var minPrice = 0;

    if (!isTradingCard) {
      maxPrice = getSettingWithDefault(SETTING_MAX_MISC_PRICE);
      minPrice = getSettingWithDefault(SETTING_MIN_MISC_PRICE);
    } else {
      maxPrice = isFoilTradingCard
        ? getSettingWithDefault(SETTING_MAX_FOIL_PRICE)
        : getSettingWithDefault(SETTING_MAX_NORMAL_PRICE);
      minPrice = isFoilTradingCard
        ? getSettingWithDefault(SETTING_MIN_FOIL_PRICE)
        : getSettingWithDefault(SETTING_MIN_NORMAL_PRICE);
    }

    maxPrice = maxPrice * 100.0;
    minPrice = minPrice * 100.0;

    var maxPriceBeforeFees = market.getPriceBeforeFees(maxPrice);
    var minPriceBeforeFees = market.getPriceBeforeFees(minPrice);

    return {
      maxPrice,
      minPrice,
      maxPriceBeforeFees,
      minPriceBeforeFees,
    };
  }

  // Calculates the average history price, before the fee.
  function calculateAverageHistoryPriceBeforeFees(history) {
    var highest = 0;
    var total = 0;

    if (history != null) {
      // Highest average price in the last xx hours.
      var timeAgo =
        Date.now() -
        getSettingWithDefault(SETTING_PRICE_HISTORY_HOURS) * 60 * 60 * 1000;

      history.forEach(function (historyItem) {
        var d = new Date(historyItem[0]);
        if (d.getTime() > timeAgo) {
          highest += historyItem[1] * historyItem[2];
          total += historyItem[2];
        }
      });
    }

    if (total == 0) return 0;

    highest = Math.floor(highest / total);
    return market.getPriceBeforeFees(highest);
  }

  // Calculates the listing price, before the fee.
  function calculateListingPriceBeforeFees(histogram) {
    if (
      typeof histogram === "undefined" ||
      histogram == null ||
      histogram.lowest_sell_order == null ||
      histogram.sell_order_graph == null
    )
      return 0;

    var listingPrice = market.getPriceBeforeFees(histogram.lowest_sell_order);

    var shouldIgnoreLowestListingOnLowQuantity =
      getSettingWithDefault(SETTING_PRICE_IGNORE_LOWEST_Q) == 1;

    if (
      shouldIgnoreLowestListingOnLowQuantity &&
      histogram.sell_order_graph.length >= 2
    ) {
      var listingPrice2ndLowest = market.getPriceBeforeFees(
        histogram.sell_order_graph[1][0] * 100
      );

      if (listingPrice2ndLowest > listingPrice) {
        var numberOfListingsLowest = histogram.sell_order_graph[0][1];
        var numberOfListings2ndLowest = histogram.sell_order_graph[1][1];

        var percentageLower =
          100 * (numberOfListingsLowest / numberOfListings2ndLowest);

        // The percentage should change based on the quantity (for example, 1200 listings vs 5, or 1 vs 25).
        if (numberOfListings2ndLowest >= 1000 && percentageLower <= 5) {
          listingPrice = listingPrice2ndLowest;
        } else if (numberOfListings2ndLowest < 1000 && percentageLower <= 10) {
          listingPrice = listingPrice2ndLowest;
        } else if (numberOfListings2ndLowest < 100 && percentageLower <= 15) {
          listingPrice = listingPrice2ndLowest;
        } else if (numberOfListings2ndLowest < 50 && percentageLower <= 20) {
          listingPrice = listingPrice2ndLowest;
        } else if (numberOfListings2ndLowest < 25 && percentageLower <= 25) {
          listingPrice = listingPrice2ndLowest;
        } else if (numberOfListings2ndLowest < 10 && percentageLower <= 30) {
          listingPrice = listingPrice2ndLowest;
        }
      }
    }

    return listingPrice;
  }

  function calculateBuyOrderPriceBeforeFees(histogram) {
    if (typeof histogram === "undefined") return 0;

    return market.getPriceBeforeFees(histogram.highest_buy_order);
  }

  // Calculate the sell price based on the history and listings.
  // applyOffset specifies whether the price offset should be applied when the listings are used to determine the price.
  function calculateSellPriceBeforeFees(
    history,
    histogram,
    applyOffset,
    minPriceBeforeFees,
    maxPriceBeforeFees
  ) {
    var historyPrice = calculateAverageHistoryPriceBeforeFees(history);
    var listingPrice = calculateListingPriceBeforeFees(histogram);
    var buyPrice = calculateBuyOrderPriceBeforeFees(histogram);

    var shouldUseAverage = getSettingWithDefault(SETTING_PRICE_ALGORITHM) == 1;
    var shouldUseBuyOrder = getSettingWithDefault(SETTING_PRICE_ALGORITHM) == 3;

    // If the highest average price is lower than the first listing, return the offset + that listing.
    // Otherwise, use the highest average price instead.
    var calculatedPrice = 0;
    if (shouldUseBuyOrder && buyPrice !== -2) {
      calculatedPrice = buyPrice;
    } else if (historyPrice < listingPrice || !shouldUseAverage) {
      calculatedPrice = listingPrice;
    } else {
      calculatedPrice = historyPrice;
    }

    var changedToMax = false;
    // List for the maximum price if there are no listings yet.
    if (calculatedPrice == 0) {
      calculatedPrice = maxPriceBeforeFees;
      changedToMax = true;
    }

    // Apply the offset to the calculated price, but only if the price wasn't changed to the max (as otherwise it's impossible to list for this price).
    if (!changedToMax && applyOffset) {
      calculatedPrice =
        calculatedPrice + getSettingWithDefault(SETTING_PRICE_OFFSET) * 100;
    }

    // Keep our minimum and maximum in mind.
    calculatedPrice = clamp(
      calculatedPrice,
      minPriceBeforeFees,
      maxPriceBeforeFees
    );

    // In case there's a buy order higher than the calculated price.
    if (
      typeof histogram !== "undefined" &&
      histogram != null &&
      histogram.highest_buy_order != null
    ) {
      var buyOrderPrice = market.getPriceBeforeFees(
        histogram.highest_buy_order
      );
      if (buyOrderPrice > calculatedPrice) calculatedPrice = buyOrderPrice;
    }

    return calculatedPrice;
  }
  //#endregion

  //#region Integer helpers
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function replaceNonNumbers(str) {
    return str.replace(/\D/g, "");
  }

  SteamMarket.prototype.getPriceHistory = function (item, cache, callback) {
    try {
      var market_name = getMarketHashName(item);
      if (market_name == null) {
        callback(ERROR_FAILED);
        return;
      }

      var appid = item.appid;

      if (cache) {
        var storage_hash = "pricehistory_" + appid + "+" + market_name;

        storageSession
          .getItem(storage_hash)
          .then(function (value) {
            if (value != null) callback(ERROR_SUCCESS, value, true);
            else market.getCurrentPriceHistory(appid, market_name, callback);
          })
          .catch(function (error) {
            market.getCurrentPriceHistory(appid, market_name, callback);
          });
      } else market.getCurrentPriceHistory(appid, market_name, callback);
    } catch (e) {
      return callback(ERROR_FAILED);
    }
  };

  //sessionid = xyz
  //appid = 535690
  //assetid = 4830605461
  //contextid = 6
  //goo_value_expected = 10
  //http://steamcommunity.com/my/ajaxgrindintogoo

  // Get the current price history for an item.
  SteamMarket.prototype.getCurrentPriceHistory = function (
    appid,
    market_name,
    callback
  ) {
    var url =
      window.location.protocol +
      "//steamcommunity.com/market/pricehistory/?appid=" +
      appid +
      "&market_hash_name=" +
      market_name;

    $.get(
      url,
      function (data) {
        if (!data || !data.success || !data.prices) {
          callback(ERROR_DATA);
          return;
        }

        // Multiply prices so they're in pennies.
        for (var i = 0; i < data.prices.length; i++) {
          data.prices[i][1] *= 100;
          data.prices[i][2] = parseInt(data.prices[i][2]);
        }

        // Store the price history in the session storage.
        var storage_hash = "pricehistory_" + appid + "+" + market_name;
        storageSession.setItem(storage_hash, data.prices);

        callback(ERROR_SUCCESS, data.prices, false);
      },
      "json"
    ).fail(function (data) {
      if (!data || !data.responseJSON) {
        return callback(ERROR_FAILED);
      }
      if (!data.responseJSON.success) {
        callback(ERROR_DATA);
        return;
      }
      return callback(ERROR_FAILED);
    });
  };

  //   market_listing_right_cell market_listing_my_price
  // Get the item name id from a market item.
  SteamMarket.prototype.getMarketItemNameId = function (item, callback) {
    try {
      var market_name = getMarketHashName(item);
      if (market_name == null) {
        callback(ERROR_FAILED);
        return;
      }

      var appid = item.appid;
      var storage_hash = "itemnameid_" + appid + "+" + market_name;

      storagePersistent
        .getItem(storage_hash)
        .then(function (value) {
          if (value != null) callback(ERROR_SUCCESS, value);
          else
            return market.getCurrentMarketItemNameId(
              appid,
              market_name,
              callback
            );
        })
        .catch(function (error) {
          return market.getCurrentMarketItemNameId(
            appid,
            market_name,
            callback
          );
        });
    } catch (e) {
      return callback(ERROR_FAILED);
    }
  };

  // Get the item name id from a market item.
  SteamMarket.prototype.getCurrentMarketItemNameId = function (
    appid,
    market_name,
    callback
  ) {
    var url =
      window.location.protocol +
      "//steamcommunity.com/market/listings/" +
      appid +
      "/" +
      market_name;
    $.get(url, function (page) {
      var matches = /Market_LoadOrderSpread\( (.+) \);/.exec(page);
      if (matches == null) {
        callback(ERROR_DATA);
        return;
      }

      var item_nameid = matches[1];

      // Store the item name id in the persistent storage.
      var storage_hash = "itemnameid_" + appid + "+" + market_name;
      storagePersistent.setItem(storage_hash, item_nameid);

      callback(ERROR_SUCCESS, item_nameid);
    }).fail(function (e) {
      return callback(ERROR_FAILED, e.status);
    });
  };

  // Get the sales listings for this item in the market, with more information.
  //
  //{
  //"success" : 1,
  //"sell_order_table" : "<table class=\"market_commodity_orders_table\"><tr><th align=\"right\">Price<\/th><th align=\"right\">Quantity<\/th><\/tr><tr><td align=\"right\" class=\"\">0,04\u20ac<\/td><td align=\"right\">311<\/td><\/tr><tr><td align=\"right\" class=\"\">0,05\u20ac<\/td><td align=\"right\">895<\/td><\/tr><tr><td align=\"right\" class=\"\">0,06\u20ac<\/td><td align=\"right\">495<\/td><\/tr><tr><td align=\"right\" class=\"\">0,07\u20ac<\/td><td align=\"right\">174<\/td><\/tr><tr><td align=\"right\" class=\"\">0,08\u20ac<\/td><td align=\"right\">49<\/td><\/tr><tr><td align=\"right\" class=\"\">0,09\u20ac or more<\/td><td align=\"right\">41<\/td><\/tr><\/table>",
  //"sell_order_summary" : "<span class=\"market_commodity_orders_header_promote\">1965<\/span> for sale starting at <span class=\"market_commodity_orders_header_promote\">0,04\u20ac<\/span>",
  //"buy_order_table" : "<table class=\"market_commodity_orders_table\"><tr><th align=\"right\">Price<\/th><th align=\"right\">Quantity<\/th><\/tr><tr><td align=\"right\" class=\"\">0,03\u20ac<\/td><td align=\"right\">93<\/td><\/tr><\/table>",
  //"buy_order_summary" : "<span class=\"market_commodity_orders_header_promote\">93<\/span> requests to buy at <span class=\"market_commodity_orders_header_promote\">0,03\u20ac<\/span> or lower",
  //"highest_buy_order" : "3",
  //"lowest_sell_order" : "4",
  //"buy_order_graph" : [[0.03, 93, "93 buy orders at 0,03\u20ac or higher"]],
  //"sell_order_graph" : [[0.04, 311, "311 sell orders at 0,04\u20ac or lower"], [0.05, 1206, "1,206 sell orders at 0,05\u20ac or lower"], [0.06, 1701, "1,701 sell orders at 0,06\u20ac or lower"], [0.07, 1875, "1,875 sell orders at 0,07\u20ac or lower"], [0.08, 1924, "1,924 sell orders at 0,08\u20ac or lower"], [0.09, 1934, "1,934 sell orders at 0,09\u20ac or lower"], [0.1, 1936, "1,936 sell orders at 0,10\u20ac or lower"], [0.11, 1937, "1,937 sell orders at 0,11\u20ac or lower"], [0.12, 1944, "1,944 sell orders at 0,12\u20ac or lower"], [0.14, 1945, "1,945 sell orders at 0,14\u20ac or lower"]],
  //"graph_max_y" : 3000,
  //"graph_min_x" : 0.03,
  //"graph_max_x" : 0.14,
  //"price_prefix" : "",
  //"price_suffix" : "\u20ac"
  //}
  SteamMarket.prototype.getItemOrdersHistogram = function (
    item,
    cache,
    callback
  ) {
    try {
      var market_name = getMarketHashName(item);
      if (market_name == null) {
        callback(ERROR_FAILED);
        return;
      }

      var appid = item.appid;

      if (cache) {
        var storage_hash = "itemordershistogram_" + appid + "+" + market_name;
        storageSession
          .getItem(storage_hash)
          .then(function (value) {
            if (value != null) callback(ERROR_SUCCESS, value, true);
            else {
              market.getCurrentItemOrdersHistogram(item, market_name, callback);
            }
          })
          .catch(function (error) {
            market.getCurrentItemOrdersHistogram(item, market_name, callback);
          });
      } else {
        market.getCurrentItemOrdersHistogram(item, market_name, callback);
      }
    } catch (e) {
      return callback(ERROR_FAILED);
    }
  };

  // Get the sales listings for this item in the market, with more information.
  SteamMarket.prototype.getCurrentItemOrdersHistogram = function (
    item,
    market_name,
    callback
  ) {
    market.getMarketItemNameId(item, function (error, item_nameid) {
      if (error) {
        if (item_nameid != 429)
          // 429 = Too many requests made.
          callback(ERROR_DATA);
        else callback(ERROR_FAILED);
        return;
      }
      var url =
        window.location.protocol +
        "//steamcommunity.com/market/itemordershistogram?language=english&currency=" +
        currencyId +
        "&item_nameid=" +
        item_nameid +
        "&two_factor=0";

      $.get(url, function (histogram) {
        // Store the histogram in the session storage.
        var storage_hash =
          "itemordershistogram_" + item.appid + "+" + market_name;
        storageSession.setItem(storage_hash, histogram);

        callback(ERROR_SUCCESS, histogram, false);
      }).fail(function () {
        return callback(ERROR_FAILED, null);
      });
    });
  };

  // Calculate the price before fees (seller price) from the buyer price
  SteamMarket.prototype.getPriceBeforeFees = function (price, item) {
    var publisherFee = -1;

    if (item != null) {
      if (item.market_fee != null) publisherFee = item.market_fee;
      else if (item.description != null && item.description.market_fee != null)
        publisherFee = item.description.market_fee;
    }

    if (publisherFee == -1) {
      if (this.walletInfo != null)
        publisherFee = this.walletInfo["wallet_publisher_fee_percent_default"];
      else publisherFee = 0.1;
    }

    price = Math.round(price);
    var feeInfo = CalculateFeeAmount(price, publisherFee, this.walletInfo);
    return price - feeInfo.fees;
  };

  // Calculate the buyer price from the seller price

  // Cannot use encodeURI / encodeURIComponent, Steam only escapes certain characters.
  function escapeURI(name) {
    var previousName = "";
    while (previousName != name) {
      previousName = name;
      name = name.replace("?", "%3F").replace("#", "%23").replace("	", "%09");
    }
    return name;
  }

  //#region Steam Market / Inventory helpers
  function getMarketHashName(item) {
    if (item == null) return null;

    if (item.description != null && item.description.market_hash_name != null)
      return escapeURI(item.description.market_hash_name);

    if (item.description != null && item.description.name != null)
      return escapeURI(item.description.name);

    if (item.market_hash_name != null) return escapeURI(item.market_hash_name);

    if (item.name != null) return escapeURI(item.name);

    return null;
  }

  function getIsTradingCard(item) {
    if (item == null) return false;
  }
  //não pode deletar
  function getIsFoilTradingCard(item) {
    if (!getIsTradingCard(item)) return false;

    // This is available on the inventory page.
    var tags =
      item.tags != null
        ? item.tags
        : item.description != null && item.description.tags != null
        ? item.description.tags
        : null;
    if (tags != null)
      if (
        item.type != null &&
        item.type.toLowerCase().includes("foil trading card")
      )
        // This is available on the market page.

        // A fallback for the market page (only works with language on English).
        return true;

    return false;
  }

  // Clamps cur between min and max (inclusive). Não pode deletar
  function clamp(cur, min, max) {
    if (cur < min) cur = min;

    if (cur > max) cur = max;

    return cur;
  }

  var logger = document.createElement("div");
  logger.setAttribute("id", "logger");

  function logConsole(text) {
    if (enableConsoleLog) {
      console.log(text);
    }
  }

  //#region Inventory + Tradeoffer

  //#region Market
  if (currentPage == PAGE_MARKET || currentPage == PAGE_MARKET_LISTING) {
    var marketListingsRelistedAssets = [];

    var marketListingsQueue = async.queue(function (listing, next) {
      marketListingsQueueWorker(listing, false, function (success, cached) {
        if (success) {
          setTimeout(
            function () {
              next();
            },
            cached ? 0 : getRandomInt(1000, 1500)
          );
        } else {
          setTimeout(
            function () {
              marketListingsQueueWorker(listing, true, function (
                success,
                cached
              ) {
                next(); // Go to the next queue item, regardless of success.
              });
            },
            cached ? 0 : getRandomInt(30000, 45000)
          );
        }
      });
    }, 1);

    marketListingsQueue.drain = function () {
      injectJs(function () {
        g_bMarketWindowHidden = false;
      });
    };

    // Gets the price, in cents, from a market listing.
    function getPriceFromMarketListing(listing) {
      var priceLabel = listing.trim().replace("--", "00");

      // Fixes RUB, which has a dot at the end.
      if (
        priceLabel[priceLabel.length - 1] === "." ||
        priceLabel[priceLabel.length - 1] === ","
      )
        priceLabel = priceLabel.slice(0, -1);

      // For round numbers (e.g., 100 EUR).
      if (priceLabel.indexOf(".") === -1 && priceLabel.indexOf(",") === -1) {
        priceLabel = priceLabel + ",00";
      }

      return parseInt(replaceNonNumbers(priceLabel));
    }

    function marketListingsQueueWorker(listing, ignoreErrors, callback) {
      var asset =
        unsafeWindow.g_rgAssets[listing.appid][listing.contextid][
          listing.assetid
        ];

      var market_hash_name = getMarketHashName(asset);
      var appid = listing.appid;

      var listingUI = $(getListingFromLists(listing.listingid).elm);

      var game_name = asset.type;
      var price = getPriceFromMarketListing(
        $(
          ".market_listing_price > span:nth-child(1) > span:nth-child(1)",
          listingUI
        ).text()
      );

      if (price <= getSettingWithDefault(SETTING_PRICE_MIN_CHECK_PRICE) * 100) {
        $(".market_listing_my_price", listingUI)
          .last()
          .css("background", COLOR_PRICE_NOT_CHECKED);
        $(".market_listing_my_price", listingUI)
          .last()
          .prop("title", "The price is not checked.");
        listingUI.addClass("not_checked");

        return callback(true, true);
      }

      var priceInfo = getPriceInformationFromItem(asset);
      var item = {
        appid: parseInt(appid),
        description: {
          market_hash_name: market_hash_name,
        },
      };

      var failed = 0;

      market.getPriceHistory(item, true, function (
        errorPriceHistory,
        history,
        cachedHistory
      ) {
        if (errorPriceHistory) {
          logConsole("Failed to get price history for " + game_name);

          if (errorPriceHistory == ERROR_FAILED) failed += 1;
        }

        market.getItemOrdersHistogram(item, true, function (
          errorHistogram,
          histogram,
          cachedListings
        ) {
          if (errorHistogram) {
            logConsole("Failed to get orders histogram for " + game_name);

            if (errorHistogram == ERROR_FAILED) failed += 1;
          }

          if (failed > 0 && !ignoreErrors) {
            return callback(false, cachedHistory && cachedListings);
          }

          // Shows the highest buy order price on the market listings.
          // The 'histogram.highest_buy_order' is not reliable as Steam is caching this value, but it gives some idea for older titles/listings.
          var highestBuyOrderPrice =
            histogram == null || histogram.highest_buy_order == null
              ? "-"
              : histogram.highest_buy_order / 100 + currencySymbol;
          $(
            ".market_table_value > span:nth-child(1) > span:nth-child(1) > span:nth-child(1)",
            listingUI
          ).append(
            ' ➤ <span  title="This is likely the highest buy order price.">' +
              histogram.graph_max_x +
              "</span>"
          );

          logConsole("============================");
          logConsole(JSON.stringify(listing));
          logConsole(game_name + ": " + asset.name);
          logConsole("Current price: " + price / 100.0);

          // Calculate two prices here, one without the offset and one with the offset.
          // The price without the offset is required to not relist the item constantly when you have the lowest price (i.e., with a negative offset).
          // The price with the offset should be used for relisting so it will still apply the user-set offset.

          var sellPriceWithoutOffset = calculateSellPriceBeforeFees(
            history,
            histogram,
            false,
            priceInfo.minPriceBeforeFees,
            priceInfo.maxPriceBeforeFees
          );
          var sellPriceWithOffset = calculateSellPriceBeforeFees(
            history,
            histogram,
            true,
            priceInfo.minPriceBeforeFees,
            priceInfo.maxPriceBeforeFees
          );

          var sellPriceWithoutOffsetWithFees = histogram.lowest_sell_order;

          logConsole(
            "Calculated price: " +
              sellPriceWithoutOffsetWithFees / 100.0 +
              " (" +
              sellPriceWithoutOffset / 100.0 +
              ")"
          );

          listingUI.addClass("price_" + sellPriceWithOffset);

          $(".market_listing_my_price", listingUI)
            .last()
            .prop(
              "title",
              "The best price is " +
                sellPriceWithoutOffsetWithFees / 100.0 +
                currencySymbol +
                "."
            );

          if (sellPriceWithoutOffsetWithFees < price) {
            logConsole("Sell price is too high.");

            $(".market_listing_my_price", listingUI)
              .last()
              .css("background", COLOR_PRICE_EXPENSIVE);
            listingUI.addClass("overpriced");

            if (getSettingWithDefault(SETTING_RELIST_AUTOMATICALLY) == 1) {
              queueOverpricedItemListing(listing.listingid);
            }
          } else if (sellPriceWithoutOffsetWithFees > price) {
            logConsole("Sell price is too low.");

            $(".market_listing_my_price", listingUI)
              .last()
              .css("background", COLOR_PRICE_CHEAP);
            listingUI.addClass("underpriced");
          } else {
            logConsole("Sell price is fair.");

            $(".market_listing_my_price", listingUI)
              .last()
              .css("background", COLOR_PRICE_FAIR);
            listingUI.addClass("fair");
          }

          $(".market_listing_my_price", listingUI)
            .last()
            .append(
              '<span id="my_market_sellistings_total_price">, ' +
                highestBuyOrderPrice +
                "</span>"
            );

          return callback(true, cachedHistory && cachedListings);
        });
      });
    }

    // Queue an overpriced item listing to be relisted.

    var marketListingsItemsQueue = async.queue(function (listing, next) {
      $.get(
        window.location.protocol +
          "//steamcommunity.com/market/mylistings?count=100&start=" +
          listing,
        function (data) {
          if (!data || !data.success) {
            next();
            return;
          }

          var myMarketListings = $("#tabContentsMyActiveMarketListingsRows");

          var nodes = $.parseHTML(data.results_html);
          var rows = $(".market_listing_row", nodes);
          myMarketListings.append(rows);

          // g_rgAssets
          unsafeWindow.MergeWithAssetArray(data.assets); // This is a method from Steam.

          next();
        },
        "json"
      ).fail(function (data) {
        next();
        return;
      });
    }, 1);

    marketListingsItemsQueue.drain = function () {
      var myMarketListings = $("#tabContentsMyActiveMarketListingsRows");
      //   myMarketListings.checkboxes("range", true);

      // Sometimes the Steam API is returning duplicate entries (especially during item listing), filter these.
      var seen = {};
      $(".market_listing_row", myMarketListings).each(function () {
        var item_id = $(this).attr("id");
        if (seen[item_id]) $(this).remove();
        else seen[item_id] = true;

        // Remove listings awaiting confirmations, they are already listed separately.
        if (
          $(".item_market_action_button", this)
            .attr("href")
            .toLowerCase()
            .includes("CancelMarketListingConfirmation".toLowerCase())
        )
          $(this).remove();

        // Remove buy order listings, they are already listed separately.
        if (
          $(".item_market_action_button", this)
            .attr("href")
            .toLowerCase()
            .includes("CancelMarketBuyOrder".toLowerCase())
        )
          $(this).remove();
      });

      // Show the listings again, rendering is done.
      $("#market_listings_spinner").remove();
      myMarketListings.show();

      fillMarketListingsQueue();

      injectJs(function () {
        g_bMarketWindowHidden = true; // Limits the number of requests made to steam by stopping constant polling of popular listings.
      });
    };

    function fillMarketListingsQueue() {
      $(".market_home_listing_table").each(function (e) {
        // Not for popular / new / recently sold items (bottom of page).

        // Buy orders and listings confirmations are not grouped like the sell listings, add this so pagination works there as well.
        if (!$(this).attr("id")) {
          $(this).attr("id", "market-listing-" + e);

          $(this).append(
            '<div class="market_listing_see" id="market-listing-container-' +
              e +
              '"></div>'
          );
          $(".market_listing_row", $(this)).appendTo(
            $("#market-listing-container-" + e)
          );
        } else {
          $(this).children().last().addClass("market_listing_see");
        }

        addMarketPagination($(".market_listing_see", this).last());
      });

      var totalPriceBuyer = 0;
      var totalPriceSeller = 0;
      // Add the listings to the queue to be checked for the price.
      for (var i = 0; i < marketLists.length; i++) {
        for (var j = 0; j < marketLists[i].items.length; j++) {
          var listingid = replaceNonNumbers(
            marketLists[i].items[j].values().market_listing_item_name
          );
          var assetInfo = getAssetInfoFromListingId(listingid);

          if (!isNaN(assetInfo.priceBuyer))
            totalPriceBuyer += assetInfo.priceBuyer;
          if (!isNaN(assetInfo.priceSeller))
            totalPriceSeller += assetInfo.priceSeller;

          marketListingsQueue.push({
            listingid,
            appid: assetInfo.appid,
            contextid: assetInfo.contextid,
            assetid: assetInfo.assetid,
          });
        }
      }

      $("#my_market_selllistings_number").append(
        '<span id="my_market_sellistings_total_price">, ' +
          (totalPriceBuyer / 100.0).toFixed(2) +
          currencySymbol +
          " ➤ " +
          (totalPriceSeller / 100.0).toFixed(2) +
          currencySymbol +
          "</span>"
      );
    }

    // Gets the asset info (appid/contextid/assetid) based on a listingid.
    function getAssetInfoFromListingId(listingid) {
      var listing = getListingFromLists(listingid);
      if (listing == null) {
        return {};
      }

      var actionButton = $(".item_market_action_button", listing.elm).attr(
        "href"
      );
      // Market buy orders have no asset info.
      if (
        actionButton == null ||
        actionButton.toLowerCase().includes("cancelmarketbuyorder")
      )
        return {};

      var priceBuyer = getPriceFromMarketListing(
        $(
          ".market_listing_price > span:nth-child(1) > span:nth-child(1)",
          listing.elm
        ).text()
      );
      var priceSeller = getPriceFromMarketListing(
        $(
          ".market_listing_price > span:nth-child(1) > span:nth-child(3)",
          listing.elm
        ).text()
      );
      var itemIds = actionButton.split(",");
      var appid = replaceNonNumbers(itemIds[2]);
      var contextid = replaceNonNumbers(itemIds[3]);
      var assetid = replaceNonNumbers(itemIds[4]);
      return {
        appid,
        contextid,
        assetid,
        priceBuyer,
        priceSeller,
      };
    }

    // Adds pagination and search options to the market item listings. Não consegui deletar
    function addMarketPagination(market_listing_see) {
      market_listing_see.addClass("list");

      market_listing_see.before('<ul class="paginationTop pagination"></ul>');
      market_listing_see.after('<ul class="paginationBottom pagination"></ul>');

      $(".market_listing_table_header", market_listing_see.parent()).append(
        '<input class="search" id="market_name_search" placeholder="Search..." />'
      );

      var options = {
        valueNames: [
          "market_listing_game_name",
          "market_listing_item_name_link",
          "market_listing_price",
          "market_listing_listed_date",
          {
            name: "market_listing_item_name",
            attr: "id",
          },
        ],
        pagination: [
          {
            name: "paginationTop",
            paginationClass: "paginationTop",
            innerWindow: 100,
            outerWindow: 100,
            left: 100,
            right: 100,
          },
          {
            name: "paginationBottom",
            paginationClass: "paginationBottom",
            innerWindow: 100,
            outerWindow: 100,
            left: 100,
            right: 100,
          },
        ],
        page: parseInt(getSettingWithDefault(SETTING_MARKET_PAGE_COUNT)),
      };

      var list = new List(market_listing_see.parent().attr("id"), options);

      marketLists.push(list);
    }

    // Process the market listings.
    function processMarketListings() {
      // Load the market listings.
      var currentCount = 0;
      var totalCount = 0;

      if (
        typeof unsafeWindow.g_oMyListings !== "undefined" &&
        unsafeWindow.g_oMyListings != null &&
        unsafeWindow.g_oMyListings.m_cTotalCount != null
      )
        totalCount = unsafeWindow.g_oMyListings.m_cTotalCount;
      else {
        totalCount = parseInt($("#my_market_selllistings_number").text());
      }

      if (isNaN(totalCount) || totalCount == 0) {
        fillMarketListingsQueue();
        return;
      }

      // Show the spinner so the user knows that something is going on.
      while (currentCount < totalCount) {
        marketListingsItemsQueue.push(currentCount);
        currentCount += 100;
      }
    }

    function getListingFromLists(listingid) {
      // Sometimes listing ids are contained in multiple lists (?), use the last one available as this is the one we're most likely interested in.
      for (var i = marketLists.length - 1; i >= 0; i--) {
        var values = marketLists[i].get(
          "market_listing_item_name",
          "mylisting_" + listingid + "_name"
        );
        if (values != null && values.length > 0) {
          return values[0];
        }
      }
    }

    // Initialize the market UI. Não pode deletar
    function initializeMarketUI() {
      //não da pra tirar
      processMarketListings();
    }
  }

  //#region UI
  injectCss(
    ".ui-selected { outline: 2px dashed #FFFFFF; } " +
      ".pagination { padding-left: 0px; }" +
      ".pagination li { display:inline-block; padding: 5px 10px;background: rgba(255, 255, 255, 0.10); margin-right: 6px; border: 1px solid #666666; }" +
      ".pagination li.active { background: rgba(255, 255, 255, 0.25); }"
  );

  $(document).ready(function () {
    // Make sure the user is logged in, there's not much we can do otherwise.
    if (!isLoggedIn) {
      return;
    }
    if (currentPage == PAGE_MARKET || currentPage == PAGE_MARKET_LISTING) {
      initializeMarketUI();
    }
  });

  function injectCss(css) {
    var head, style;
    head = document.getElementsByTagName("head")[0];
    if (!head) {
      return;
    }
    style = document.createElement("style");
    style.type = "text/css";
    style.innerHTML = css;
    head.appendChild(style);
  }

  function injectJs(js) {
    var script = document.createElement("script");
    script.setAttribute("type", "application/javascript");
    script.textContent = "(" + js + ")();";
    document.body.appendChild(script);
    document.body.removeChild(script);
  }

  //#endregion
})(jQuery, async);
