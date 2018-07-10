/* global numeral:false, $scope:false */

app.service('grid', function () {
    var colClass = '';
    var colWidth = '';
    var columns = [];

    this.refresh = function (columns, id, query, designerMode, properties) {
        this.simpleGrid(columns, id, query, designerMode, properties, function () {});
    };

    this.extendedGridV2 = function (report, mode) {
        let id;
        if (typeof report.id === 'undefined') {
            id = report._id;
        } else {
            id = report.id;
        }
        
        var theProperties = report.properties;
        var pageBlock = 'page-block';

        if (mode === 'preview') {
            pageBlock = '';
        }

        var reportStyle = 'width:100%;padding-left:0px;padding-right:0px;';
        var headerStyle = 'width:100%;padding-left:0px;background-color:#ccc;';
        var rowStyle = 'width:100%;padding:0px';
        var columnDefaultStyle = 'height:40px;overflow:hidden;padding:2px; border-bottom: 1px solid #ccc;border-right: 1px solid #ccc;';

        if (!theProperties.backgroundColor) theProperties.backgroundColor = '#FFFFFF';
        if (!theProperties.height) theProperties.height = 400;
        if (!theProperties.headerHeight) theProperties.headerHeight = 30;
        if (!theProperties.rowHeight) theProperties.rowHeight = 20;
        if (!theProperties.headerBackgroundColor) theProperties.headerBackgroundColor = '#FFFFFF';
        if (!theProperties.headerBottomLineWidth) theProperties.headerBottomLineWidth = 4;
        if (!theProperties.headerBottomLineColor) theProperties.headerBottomLineColor = '#999999';
        if (!theProperties.rowBorderColor) theProperties.rowBorderColor = '#CCCCCC';
        if (!theProperties.rowBottomLineWidth) theProperties.rowBottomLineWidth = 1;
        if (!theProperties.columnLineWidht) theProperties.columnLineWidht = 0;

        // margins
        // paddings

        if (theProperties) {
            reportStyle += 'background-color:' + theProperties.backgroundColor + ';';
            // reportStyle += 'height:'+theProperties.height+'px;';

            columnDefaultStyle += 'height:' + theProperties.rowHeight + 'px;';
            var paddingTop = (theProperties.rowHeight - 14) / 2;
            columnDefaultStyle += 'padding-top:' + paddingTop + 'px;';

            headerStyle += 'background-color:' + theProperties.headerBackgroundColor + ';';
            headerStyle += 'height:' + theProperties.headerHeight + 'px;';
            headerStyle += 'border-bottom: ' + theProperties.headerBottomLineWidth + 'px solid ' + theProperties.headerBottomLineColor + ';';

            columnDefaultStyle += 'border-bottom: ' + theProperties.rowBottomLineWidth + 'px solid ' + theProperties.rowBorderColor + ';';
            columnDefaultStyle += 'border-right: ' + theProperties.columnLineWidht + 'px solid ' + theProperties.rowBorderColor + ';';
        }

        var htmlCode = '<div ' + pageBlock + ' id="REPORT_' + id + '" ndType="extendedGrid" class="container-fluid report-container" style="' + reportStyle + '">';

        columns = report.properties.columns;

        if (columns.length > 4) { colWidth = 'width:' + 100 / columns.length + '%;float:left;'; } else { colClass = 'col-xs-' + 12 / columns.length; }

        // header
        htmlCode += '<div class="container-fluid" style="' + headerStyle + '">';
        for (let i = 0; i < columns.length; i++) {
            htmlCode += getHeaderColumn(columns[i], i);
        }
        htmlCode += '</div>';

        htmlCode += '<div vs-repeat style="width:100%;overflow-y: scroll;border: 1px solid #ccc;align-items: stretch;position: absolute;bottom: 0px;top: ' 
            + theProperties.headerHeight + 'px;" scrolly="gridGetMoreData(\'' + id + '\')">';

        htmlCode += '<div ndType="repeaterGridItems" class="repeater-data container-fluid" ng-repeat="item in report.query.data | filter:theFilter | orderBy:report.predicate:report.reverse  " style="' + rowStyle + '"  >';

        for (let i = 0; i < columns.length; i++) {
            htmlCode += getDataCell(columns[i], id, i, columnDefaultStyle);
        }

        htmlCode += '</div>';

        htmlCode += '<div ng-if="report.query.data.length == 0" >No data found</div>';

        htmlCode += '</div>';

        htmlCode += '<div class="repeater-data">';
        for (const i in columns) {
            var elementID = 'wst' + columns[i].elementID.toLowerCase();
            var elementName = elementID.replace(/[^a-zA-Z ]/g, '');
            if (columns[i].aggregation) {
                elementName = elementName + columns[i].aggregation;
            }
            htmlCode += '<div class=" calculus-data-column ' + colClass + ' " style="' + colWidth + '"> ' + calculateForColumn(report, i, elementName) + ' </div>';
        }
        htmlCode += '</div> </div>';

        return htmlCode;
    };

    function getHeaderColumn (column, columnIndex) {
        var htmlCode = '';
        var elementID = 'wst' + column.elementID.toLowerCase();
        var elementName = elementID.replace(/[^a-zA-Z ]/g, '');
        if (column.aggregation) {
            elementName = "'" + elementName + column.aggregation + "'";
        }
        htmlCode += '<div class="' + colClass + ' report-repeater-column-header" style="' + colWidth + '"><table style="table-layout:fixed;width:100%"><tr><td style="overflow:hidden;white-space: nowrap;width:95%;">' + column.objectLabel + '</td></tr></table> </div>';

        return htmlCode;
    }

    function getDataCell (column, gridID, columnIndex, columnDefaultStyle) {
        var htmlCode = '';

        // var elementName = column.collectionID.toLowerCase()+'_'+column.elementName;
        var elementID = 'wst' + column.elementID.toLowerCase();
        var elementName = elementID.replace(/[^a-zA-Z ]/g, '');
        // var elementName = 'wst'+column.elementID.toLowerCase();
        // var elementID = column.elementID;

        if (column.aggregation) {
            elementName = elementName + column.aggregation;
        }

        var theValue = '<div style="overflow:hidden;height:100%;">{{item.' + elementName + '}}</div>';
        if (column.elementType === 'number') { theValue = '<div style="overflow:hidden;height:100%;">{{item.' + elementName + ' | number}}</div>'; }

        if (column.signals) {
            var theStyle = '<style>';
            var theClass = '';
            for (var s in column.signals) {
                theStyle += ' .customStyle' + s + '_' + columnIndex + '{color:' + column.signals[s].color + ';background-color:' + column.signals[s]['background-color'] + ';font-size:' + column.signals[s]['font-size'] + ';font-weight:' + column.signals[s]['font-weight'] + ';font-style:' + column.signals[s]['font-style'] + ';}';
                var theComma = '';
                if (s > 0) { theComma = ' , '; }

                var operator = '>';

                switch (column.signals[s].filter) {
                case 'equal':
                    operator = ' == ' + column.signals[s].value1;
                    break;
                case 'diferentThan':
                    operator = ' != ' + column.signals[s].value1;
                    break;
                case 'biggerThan':
                    operator = ' > ' + column.signals[s].value1;
                    break;
                case 'biggerOrEqualThan':
                    operator = ' >= ' + column.signals[s].value1;
                    break;
                case 'lessThan':
                    operator = ' < ' + column.signals[s].value1;
                    break;
                case 'lessOrEqualThan':
                    operator = ' <= ' + column.signals[s].value1;
                    break;
                case 'between':
                    operator = ' >= ' + column.signals[s].value1 + ' && {{item.' + elementName + '}} <= ' + column.signals[s].value2;
                    break;
                case 'notBetween':
                    operator = ' < ' + column.signals[s].value1 + ' || {{item.' + elementName + '}}  > ' + column.signals[s].value2;
                    break;
                }

                theClass += theComma + 'customStyle' + s + '_' + columnIndex + ' : {{item.' + elementName + '}} ' + operator;
            }
            htmlCode += theStyle + '</style>';

            if (column.elementType === 'number') { theValue = '<div ng-class="{' + theClass + '}" style="overflow:hidden;height:100%;" >{{item.' + elementName + ' | number}}</div>'; } else { theValue = '<div ng-class="{' + theClass + '}" style="overflow:hidden;height:100%;" >{{item.' + elementName + '}}</div>'; }
        }

        if (column.link) {
            if (column.link.type === 'report') {
                if (column.elementType === 'number') { theValue = '<a class="columnLink" style="overflow:hidden;height:100%;" href="/#/reports/' + column.link._id + '/' + column.link.promptElementID + '/{{item.' + elementName + '}}">{{item.' + elementName + ' | number}}</a>'; } else { theValue = '<a class="columnLink" style="overflow:hidden;height:100%;" href="/#/reports/' + column.link._id + '/' + column.link.promptElementID + '/{{item.' + elementName + '}}">{{item.' + elementName + '}}</a>'; }
            }
            if (column.link.type === 'dashboard') {
                if (column.elementType === 'number') { theValue = '<a class="columnLink" style="overflow:hidden;height:100%;" href="/#/dashboards/' + column.link._id + '/' + column.link.promptElementID + '/{{item.' + elementName + '}}">{{item.' + elementName + ' | number}}</a>'; } else { theValue = '<a class="columnLink" style="overflow:hidden;height:100%;" href="/#/dashboards/' + column.link._id + '/' + column.link.promptElementID + '/{{item.' + elementName + '}}">{{item.' + elementName + '}}</a>'; }
            }
        }

        var columnStyle = '';
        if (column.columnStyle) {
            columnStyle = 'color:' + column.columnStyle.color + ';';

            for (var key in column.columnStyle) {
                columnStyle += key + ':' + column.columnStyle[key] + ';';
            }
        }

        var defaultAligment = '';
        if (column.elementType === 'number') { defaultAligment = 'text-align: right;'; }

        htmlCode += '<div id="ROW_' + gridID + '" class="repeater-data-column ' + colClass + '" style="' + columnDefaultStyle + columnStyle + colWidth + defaultAligment + '" >' + theValue + ' </div>';

        return htmlCode;
    }

    function calculateForColumn (report, columnIndex, elementName) {
        var htmlCode = '';

        if (columns[columnIndex].operationSum === true) {
            htmlCode += '<div  style=""><span class="calculus-label">SUM:</span><span class="calculus-value"> ' + numeral(calculateSumForColumn(columnIndex, elementName)).format('0,0.00') + '</span> </div>';
        }

        if (columns[columnIndex].operationAvg === true) {
            htmlCode += '<div  style=""><span class="calculus-label">AVG:</span><span class="calculus-value"> ' + numeral(calculateAvgForColumn(columnIndex, elementName)).format('0,0.00') + '</span> </div>';
        }

        if (columns[columnIndex].operationCount === true) {
            htmlCode += '<div  style=""><span class="calculus-label">COUNT:</span><span class="calculus-value"> ' + numeral(calculateCountForColumn(columnIndex, elementName)).format('0,0.00') + '</span> </div>';
        }

        if (columns[columnIndex].operationMin === true) {
            htmlCode += '<div  style=""><span class="calculus-label">MIN:</span><span class="calculus-value"> ' + numeral(calculateMinimumForColumn(columnIndex, elementName)).format('0,0.00') + '</span> </div>';
        }
        if (columns[columnIndex].operationMax === true) {
            htmlCode += '<div  style=""><span class="calculus-label">MAX:</span><span class="calculus-value"> ' + numeral(calculateMaximumForColumn(columnIndex, elementName)).format('0,0.00') + '</span> </div>';
        }

        return htmlCode;
    }

    function calculateSumForColumn (columnIndex, elementName) {
        var value = 0;

        for (var row of $scope.report.query.data) {

            if (row[elementName]) {
                if (typeof row[elementName] !== 'undefined') { value += Number(row[elementName]); }
            }
        }
        return value;
    }

    function calculateCountForColumn (columnIndex, elementName) {
        var count = 0;
        for (var row of $scope.report.query.data) {
            if (row[elementName]) {
                if (typeof row[elementName] !== 'undefined') {
                    count += 1;
                }
            }
        }
        return count;
    }

    function calculateAvgForColumn (columnIndex, elementName) {
        var sum = 0;
        var count = 0;

        for (var row in $scope.report.query.data) {

            if (row[elementName]) {
                if (typeof row[elementName] !== 'undefined') {
                    count += 1;
                    value += Number(row[elementName]);
                }
            }
        }
        return value / count;
    }

    function calculateMinimumForColumn (columnIndex, elementName) {
        var lastValue;

        for (var row in $scope.report.query.data) {

            if (row[elementName]) {
                if (typeof row[elementName] !== 'undefined') {
                    if (typeof lastValue === 'undefined') { lastValue = row[elementName]; }

                    if (row[elementName] < lastValue) { lastValue = row[elementName]; }
                }
            }
        }
        return lastValue;
    }

    function calculateMaximumForColumn ($scope, columnIndex, elementName) {
        var lastValue;

        for (var row in $scope.report.query.data) {

            if (row[elementName]) {
                if (typeof row[elementName] !== 'undefined') {
                    if (typeof lastValue === 'undefined') { lastValue = row[elementName]; }

                    if (row[elementName] > lastValue) { lastValue = row[elementName]; }
                }
            }
        }
        return lastValue;
    }

});

app.directive('scrolly', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var raw = element[0];
            element.bind('scroll', function () {
                if (raw.scrollTop + raw.offsetHeight > raw.scrollHeight) {
                    scope.$apply(attrs.scrolly);
                }
            });
        }
    };
});
