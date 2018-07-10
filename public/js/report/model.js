/* global XLSX: false, saveAs: false, Blob: false, datenum: false */

app.service('reportModel', function (c3Charts, reportHtmlWidgets, grid, bsLoadingOverlayService, connection, $routeParams, verticalGrid, pivot, uuid2) {
    var report = {};

    this.getReportDefinition = async function (id, isLinked) {
        const data = await connection.get('/api/reports/get-report/' + id, {id: id, mode: 'preview', linked: isLinked});
        if (data.item) {
            // report = data.item;
            return data.item;
        } else {
            return null;
        }
    };

    this.getLayers = async function () {
        var data = await connection.get('/api/layers/get-layers', {});
        if (data.result !== 1) {
            throw new Error(data.msg);
        }

        var layers = data.items;

        for(layer of layers){
            layer.rootItem = {
                elementLabel: '',
                elementRole: 'root',
                elements: layer.objects
            }
        }

        return layers;
    };

    /* 
    * Fetches all of the data associated to the report's query, and stores it in report.query.data
    */
    this.fetchData = async function (query, params){

        if(query.columns.length === 0){
            console.log('nothing to fetch');
            return {};
        }

        var request = {};

        if(!params){
            params = {};
        }

        if(params.page !== undefined){ 
            request.page = params.page;
        }else{
            request.page = 1;
        }

        request.query = clone(query);

        if(!query.recordLimit && params.selectedRecordLimit){
            request.query.recordLimit = params.selectedRecordLimit;
        }

        var result = await connection.get('/api/reports/get-data', request);

        if(result.result === 0){
            noty({text: result.msg, timeout: 2000, type: 'error'});
            return {
                data : []
            }
        }

        var data = result.data;
        
        // processData(data);

        query.data = result.data;

        return {
            data : data,
            sql : result.sql,
            time : result.time
        }
    }

    function processData (data){
        var dateTimeReviver = function (key, value) {
            var a;
            if (typeof value === 'string') {
                a = /\/Date\((\d*)\)\//.exec(value);
                if (a) {
                    return new Date(+a[1]);
                }
            }
            return value;
        };

        return JSON.parse(JSON.stringify(data), dateTimeReviver);
    }
  
    this.initChart = function (report) {

        report.properties.chart = {
            id : 'Chart' + uuid2.newguid(),
            dataPoints: [],
            dataColumns: [],
            datax: {},
            height: 300,
            type: 'bar',
            query: report.query,
            queryName: null
        };

        if (report.reportType === 'chart-donut') { report.properties.chart.type = 'donut'; }
        if (report.reportType === 'chart-pie') { report.properties.chart.type = 'pie'; }
        if (report.reportType === 'gauge') { report.properties.chart.type = 'gauge'; }

        if ( ['chart-line', 'chart-donut','chart-pie'].indexOf(report.reportType) >= 0 && 
            report.properties.xkeys.length > 0 && report.properties.ykeys.length > 0) {

            report.properties.chart.dataColumns = report.properties.ykeys;

            const dataAxisInfo = report.properties.xkeys[0];
            report.properties.chart.dataAxis = {
                elementName: dataAxisInfo.elementName,
                queryName: 'query1',
                elementLabel: dataAxisInfo.objectLabel,
                id: dataAxisInfo.id,
                type: 'bar',
                color: '#000000'};

                if(report.properties.xkeys.length > 1){
                    const stackDimensionInfo = report.properties.xkeys[1];
                    report.properties.chart.stackDimension = {
                        elementName: stackDimensionInfo.elementName,
                        queryName: 'query1',
                        elementLabel: stackDimensionInfo.objectLabel,
                        id: stackDimensionInfo.id,
                        type: 'bar',
                        color: '#000000'};
                }
        }

        if(report.reportType === 'gauge'){
            report.properties.chart.dataColumns = report.properties.ykeys;
        }
    }

    function generateNoDataHTML () {
        var htmlCode = '<span style="font-size: small;color: darkgrey;padding: 5px;">' + report.reportName + '</span><div style="width: 100%;height: 100%;display: flex;align-items: center;"><span style="color: darkgray; font-size: initial; width:100%;text-align: center";><img src="/images/empty.png">No data for this report</span></div>';
        var el = document.getElementById(report.parentDiv);
        if (el) {
            angular.element(el).empty();
            var $div = $(htmlCode);
            angular.element(el).append($div);
            angular.element(document).injector().invoke(function ($compile) {
                var scope = angular.element($div).scope();
                $compile($div)(scope);
                // hideOverlay('OVERLAY_'+report.parentDiv);
                hideOverlay(report.parentDiv);
            });
        }
    }
    function showOverlay (referenceId) {
        bsLoadingOverlayService.start({
            referenceId: referenceId
        });
    };

    function hideOverlay (referenceId) {
        bsLoadingOverlayService.stop({
            referenceId: referenceId
        });
    };

    var selectedColumn;

    this.selectedColumn = function () {
        return selectedColumn;
    };

    var selectedColumnHashedID;

    this.selectedColumnHashedID = function () {
        return selectedColumnHashedID;
    };

    var selectedColumnIndex;

    this.selectedColumnIndex = function () {
        return selectedColumnIndex;
    };

    this.changeColumnStyle = function (report, columnIndex, hashedID) {
        selectedColumn = report.properties.columns[columnIndex];
        selectedColumnHashedID = hashedID;
        selectedColumnIndex = columnIndex;

        if (!selectedColumn.columnStyle) { selectedColumn.columnStyle = {color: '#000', 'background-color': '#EEEEEE', 'text-align': 'left', 'font-size': '12px', 'font-weight': 'normal', 'font-style': 'normal'}; }

        $('#columnFormatModal').modal('show');
    };

    this.changeColumnSignals = function (report, columnIndex, hashedID) {
        selectedColumn = report.properties.columns[columnIndex];
        selectedColumnHashedID = hashedID;
        selectedColumnIndex = columnIndex;

        if (!selectedColumn.signals) { selectedColumn.signals = []; }
        $('#columnSignalsModal').modal('show');
    };

    this.orderColumn = function (report, columnIndex, desc, hashedID) {
        var theColumn = report.query.columns[columnIndex];
        if (desc) {
            theColumn.sortType = 1;
        } else {
            theColumn.sortType = -1;
        }
        report.query.order = [];
        report.query.order.push(theColumn);
        showOverlay('OVERLAY_' + hashedID);

        // queryModel.getQueryData(report.query).then(data => {
        //     report.query.data = data.data;
        //     hideOverlay('OVERLAY_' + hashedID);
        // });
        // get the column index, identify the report.query.column by  index, then add to query.order taking care about the sortType -1 / 1
    };

    function clone (obj) {
        if (obj == null || typeof obj !== 'object') return obj;
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }

    this.saveAsReport = async function (report, mode) {
        // Cleaning up the report object
        var clonedReport = clone(report);
        if (clonedReport.properties.chart) {
            clonedReport.properties.chart.chartCanvas = undefined;
            clonedReport.properties.chart.data = undefined;
            // clonedReport.properties.chart.query = undefined;
        }
        if (clonedReport.query.data) { clonedReport.query.data = undefined; }
        clonedReport.parentDiv = undefined;

        var result;

        if (mode === 'add') {
            result = await connection.post('/api/reports/create', clonedReport);
        } else {
            result = await connection.post('/api/reports/update/' + report._id, clonedReport);
        }

        if (result.result === 1) {
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    };

    this.duplicateReport = async function (duplicateOptions) {
        const params = { id: duplicateOptions.report._id };
        var newReport = (await connection.get('/api/reports/find-one', params)).item;

        delete newReport._id;
        delete newReport.createdOn;
        newReport.reportName = duplicateOptions.newName;

        const data = await connection.post('/api/reports/create', newReport);
        if (data.result !== 1) {
            // TODO indicate error
        }
    };

    this.saveToExcel = function ($scope, reportHash) {
        var wopts = { bookType: 'xlsx', bookSST: false, type: 'binary' };
        var ws_name = $scope.selectedReport.reportName;

        var wb = new Workbook();
        var ws = sheet_from_array_of_arrays($scope, reportHash);

        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;

        var wbout = XLSX.write(wb, wopts);

        function s2ab (s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (let i = 0; i !== s.length; ++i) {
                view[i] = s.charCodeAt(i) & 0xFF;
            }

            return buf;
        }

        saveAs(new Blob([s2ab(wbout)], {type: ''}), ws_name + '.xlsx');
    };

    function Workbook () {
        if (!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }

    function sheet_from_array_of_arrays ($scope, reportHash) {
        var data = $scope.selectedReport.query.data;
        var report = $scope.selectedReport;
        var ws = {};
        var range = {s: {c: 10000000, r: 10000000}, e: { c: 0, r: 0 }};
        for (var i = 0; i < report.properties.columns.length; i++) {
            if (range.s.r > 0) range.s.r = 0;
            if (range.s.c > i) range.s.c = i;
            if (range.e.r < 0) range.e.r = 0;
            if (range.e.c < i) range.e.c = i;

            var cell = { v: report.properties.columns[i].objectLabel };
            var cell_ref = XLSX.utils.encode_cell({c: i, r: 0});
            if (typeof cell.v === 'number') cell.t = 'n';
            else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
                cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                cell.v = datenum(cell.v);
            } else cell.t = 's';

            ws[cell_ref] = cell;
        }

        for (let R = 0; R !== data.length; ++R) {
            for (let i = 0; i < report.properties.columns.length; i++) {
                // var elementName = report.properties.columns[i].collectionID.toLowerCase()+'_'+report.properties.columns[i].elementName;
                var elementID = 'wst' + report.properties.columns[i].elementID.toLowerCase();
                var elementName = elementID.replace(/[^a-zA-Z ]/g, '');

                if (report.properties.columns[i].aggregation) {
                    // elementName = report.properties.columns[i].collectionID.toLowerCase()+'_'+report.properties.columns[i].elementName+report.properties.columns[i].aggregation;
                    elementID = 'wst' + report.properties.columns[i].elementID.toLowerCase() + report.properties.columns[i].aggregation;
                    elementName = elementID.replace(/[^a-zA-Z ]/g, '');
                }
                if (range.s.r > R + 1) range.s.r = R + 1;
                if (range.s.c > i) range.s.c = i;
                if (range.e.r < R + 1) range.e.r = R + 1;
                if (range.e.c < i) range.e.c = i;

                let cell;
                if (report.properties.columns[i].elementType === 'number' && data[R][elementName]) {
                    cell = { v: Number(data[R][elementName]) };
                } else {
                    cell = { v: data[R][elementName] };
                }
                cell_ref = XLSX.utils.encode_cell({c: i, r: R + 1});
                if (typeof cell.v === 'number') cell.t = 'n';
                else if (typeof cell.v === 'boolean') cell.t = 'b';
                else if (cell.v instanceof Date) {
                    cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                    cell.v = datenum(cell.v);
                } else cell.t = 's';

                cell.s = { fill: { fgColor: { rgb: 'FFFF0000' } } };

                ws[cell_ref] = cell;
            }
        }
        if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);

        return ws;
    }

    this.getReportContainerHTML = function (reportID) {
        var containerID = 'REPORT_CONTAINER_' + reportID;

        var html = '<div page-block  class="container-fluid featurette ndContainer"  ndType="container" style="height:100%;padding:0px;">' +
                        '<div page-block class="col-md-12 ndContainer" ndType="column" style="height:100%;padding:0px;">' +
                            '<div page-block class="container-fluid" id="' + containerID
                             + '" report-view report="getReport(\'' + reportID +'\')" style="padding:0px;position: relative;height: 100%;"></div>' +
                        '</div>' +
                    '</div>';

        return html;
    };

    this.getPromptHTML = function (prompt) {
        var html = '<div id="PROMPT_' + prompt.elementID + '" page-block class="ndContainer" ndType="ndPrompt"><nd-prompt  filter="getFilter(' + "'" + prompt.elementID + "'" + ')" element-id="' + prompt.elementID + '" label="' + prompt.objectLabel + '" value-field="' + prompt.name + '" show-field="' + prompt.name + '" prompts="prompts" after-get-values="afterPromptGetValues" on-change="promptChanged" ng-model="lastPromptSelectedValue"></nd-prompt></div>';

        return html;
    };

});
