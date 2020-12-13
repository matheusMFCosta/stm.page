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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const idsMap = {
    productName: "#stm.plg.product.name",
    productValue: "#stm.plg.product.value",
    productId: "#stm.plg.product.id",
};
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
        var url = window.location.protocol +
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
const getCurrentMarketItemNameId = (appid, market_name) => __awaiter(this, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        var url = window.location.protocol +
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
});
const isUserLogged = () => (typeof unsafeWindow.g_rgWalletInfo !== "undefined" &&
    unsafeWindow.g_rgWalletInfo != null) ||
    (typeof unsafeWindow.g_bLoggedIn !== "undefined" && unsafeWindow.g_bLoggedIn);
const getProductDetails = () => __awaiter(this, void 0, void 0, function* () {
    const href = document
        .getElementsByClassName("item_market_actions")[0]
        //@ts-ignore
        .getElementsBySelector("a")[0].href;
    const splitedUrl = href.split("/");
    const productName = splitedUrl[splitedUrl.length - 1];
    const appId = splitedUrl[splitedUrl.length - 2];
    const productId = yield getCurrentMarketItemNameId(appId, productName);
    const histogram = yield getCurrentItemOrdersHistogram(productId);
    const lowest_sell_order = histogram.lowest_sell_order;
    return {
        id: productId,
        name: productName,
        value: lowest_sell_order,
    };
});
const updateProductDetails = (productDetail) => {
    document.getElementById(idsMap.productId).textContent = productDetail.id;
    document.getElementById(idsMap.productName).textContent = productDetail.name;
    document.getElementById(idsMap.productValue).textContent =
        productDetail.value;
};
const initializeControlPanel = () => {
    const selector = "#global_header";
    $(selector).append(`<div style="background: #8F98A0; position: absolute; z-index: 9999; top: 10px; right: 10px; width: 200px; height: 300px; color: #000;">
      <div style="display: flex; flex-direction: column;">
        <span >Product Details </span>
        <span >Value: <span id="${idsMap.productId}">N/A</span><span>
        <span >Name: <span id="${idsMap.productName}">N/A</span><span>
        <span >Value: <span id="${idsMap.productValue}">N/A</span><span>
      </div>
    </div>`);
};
const initializeStriptEvents = () => {
    const ProductButton = $(document.getElementById("inventories"));
    $(ProductButton).on("click", () => __awaiter(this, void 0, void 0, function* () {
        const productDetails = yield getProductDetails();
        updateProductDetails(productDetails);
    }));
};
const initializeScript = () => {
    initializeControlPanel();
    initializeStriptEvents();
};
(function ($, async) {
    console.log(Object.keys(document));
    console.log(document.location);
    console.log(Object.keys($));
    $(document).ready(function () {
        if (!isUserLogged())
            return;
        if (document.location.pathname.includes("market"))
            initializeScript();
        if (document.location.pathname.includes("inventory"))
            initializeScript();
    });
    //@ts-ignore
})(jQuery, async);
//# sourceMappingURL=quick-sell.js.map