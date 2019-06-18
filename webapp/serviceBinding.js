function initModel() {
	var sUrl = "/sap/opu/odata/sap/ZGW_LS_FO_SERVICES_SRV/";
	var oModel = new sap.ui.model.odata.ODataModel(sUrl, true);
	sap.ui.getCore().setModel(oModel);
}