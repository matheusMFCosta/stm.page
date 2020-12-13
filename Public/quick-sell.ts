// ==UserScript==
// @name        Steam Quick sell
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
// @require     https://code.jquery.com/jquery-3.5.1.min.js
// @require     https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/async/2.6.0/async.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/localforage/1.7.1/localforage.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/list.js/1.5.0/list.js
// @grant       unsafeWindow
// ==/UserScript==
// jQuery is already added by Steam, force no conflict mode.

enum pages {
  Market = "market",
  Inventory = "inventory",
}

let currentPage: pages = pages.Market;

const getMarketElementById = (element: string) => {
  if (currentPage === pages.Inventory)
    //@ts-ignore
    return window.parent.$(element);
  return $(element);
};

const getInventoryElementById = (element: string) => {
  return $(element);
};

const localStorageMap = {
  isFixed: "stm.plg.isFixed",
  value: "stm.plg.value",
};

const idsMap = {
  productName: "stm.plg.product.name",
  productValue: "stm.plg.product.value",
  productId: "stm.plg.product.id",
  modifyInput: "stm.plg.modify.input",
  modifyButton: "stm.plg.modify.button",
  modifyTypeFixed: "stm.plg.modify.type.fixed",
  modifyTypePercent: "stm.plg.modify.type.percent",
};

interface ProductDetail {
  id: string;
  name: string;
  value: string;
}

declare const unsafeWindow: any;
declare const $: any;
const country = "BR";
const language = "brazilian";
const currencyId = 7;
let productDetail = {
  id: "",
  name: "",
  value: "",
};

const getCurrentItemOrdersHistogram = (itemId) => {
  return new Promise((resolve, reject) => {
    var url =
      window.location.protocol +
      "//steamcommunity.com/market/itemordershistogram?language=english&currency=" +
      currencyId +
      "&item_nameid=" +
      itemId +
      "&two_factor=0";

    $.get(url, function (histogram) {
      resolve(histogram);
    }).fail(function () {
      reject({});
    });
  });
};

const getCurrentMarketItemNameId = async (
  appid,
  market_name
): Promise<string> => {
  return new Promise((resolve, reject) => {
    var url =
      window.location.protocol +
      "//steamcommunity.com/market/listings/" +
      appid +
      "/" +
      market_name;

    $.get(url, function (page) {
      var matches = /Market_LoadOrderSpread\( (.+) \);/.exec(page);
      var item_nameid = matches[1];
      resolve(item_nameid);
    }).fail(function (error) {
      alert(error);
    });
  });
};

const isUserLogged = () =>
  (typeof unsafeWindow.g_rgWalletInfo !== "undefined" &&
    unsafeWindow.g_rgWalletInfo != null) ||
  (typeof unsafeWindow.g_bLoggedIn !== "undefined" && unsafeWindow.g_bLoggedIn);

const getProductDetails = async (): Promise<ProductDetail> => {
  const href = document
    .getElementsByClassName("item_market_actions")[0]
    //@ts-ignore
    .getElementsBySelector("a")[0].href;

  const splitedUrl = href.split("/");
  const productName = splitedUrl[splitedUrl.length - 1];
  const appId = splitedUrl[splitedUrl.length - 2];

  const productId: string = await getCurrentMarketItemNameId(
    appId,
    productName
  );
  const histogram: any = await getCurrentItemOrdersHistogram(productId);
  const lowest_sell_order = histogram.lowest_sell_order;

  return {
    id: productId,
    name: productName,
    value: lowest_sell_order,
  };
};

const updateProductDetails = (productDetail: ProductDetail) => {
  console.log(productDetail);
  getMarketElementById(idsMap.productId).textContent = productDetail.id;
  getMarketElementById(idsMap.productName).textContent = productDetail.name;
  getMarketElementById(idsMap.productValue).textContent = productDetail.value;
};

const initializeControlPanel = async (): Promise<void> => {
  const selector = "#global_header";

  const defaultValue = localStorage.getItem(localStorageMap.value) || "";
  const isFixedLocalStorage = localStorage.getItem(localStorageMap.isFixed);
  const isFixed =
    isFixedLocalStorage === "true" || isFixedLocalStorage === null;

  $(selector).append(
    `<div style="background: #8F98A0; position: absolute; z-index: 9999; top: 10px; right: 10px; width: 200px; height: 300px; color: #000;">
      <div style="display: flex; flex-direction: column;">
        <span >Product Details </span>
        <span >Id: <span id="${idsMap.productId}">N/A</span><span>
        <span >Name: <span id="${idsMap.productName}">N/A</span><span>
        <span >Value: <span id="${idsMap.productValue}">N/A</span><span>

        <div id="types">
          <input type="radio" id="${
            idsMap.modifyTypeFixed
          }" name="type" value="fixed" ${
      isFixed ? "checked='true'" : ""
    }"> fixed
          <input type="radio" id="${
            idsMap.modifyTypePercent
          }" name="type" value="percent" ${
      isFixed ? "" : "checked='true'"
    }> percent
        </div>
        <label for="${idsMap.modifyInput}"/> Modifier </label>
        <input id="${idsMap.modifyInput}" value="${defaultValue}" />
        <input id="${idsMap.modifyButton}" type="button" value="Submit"/>
   
      </div>
    </div>`
  );

  document.getElementById(idsMap.modifyButton).addEventListener("click", () => {
    const isFixed = (document.getElementById(idsMap.modifyTypeFixed) as any)
      .checked;
    const value = (document.getElementById(idsMap.modifyInput) as any).value;
    localStorage.setItem(localStorageMap.isFixed, isFixed);
    localStorage.setItem(localStorageMap.value, value);
  });
};

const initializeStriptEvents = () => {
  const ProductButton = $(document.getElementById("inventories"));
  $(ProductButton).on("click", async () => {
    const productDetails = await getProductDetails();
    updateProductDetails(productDetails);
  });
};

const initializeScript = () => {
  initializeControlPanel();
  initializeStriptEvents();
};

(function ($, async) {
  $(document).ready(function () {
    if (!isUserLogged()) return;
    currentPage = document.location.pathname.includes("market")
      ? pages.Market
      : pages.Inventory;
    if (window.location.host === "steamcommunity.com") initializeScript();
  });
  //@ts-ignore
})(jQuery, async);
