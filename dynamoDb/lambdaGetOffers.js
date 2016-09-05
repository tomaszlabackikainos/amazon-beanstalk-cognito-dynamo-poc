'use strict';
console.log('Loading function');

let doc = require('aws-sdk');
let db = new doc.DynamoDB();

/**
 * Provide an event that contains the following keys:
 *
 *   - operation: one of the operations in the switch statement below
 *   - tableName: required for operations that interact with DynamoDB
 *   - payload: a parameter to pass to the operation being performed
 */
exports.handler = (event, context, callback) => {
    var queryParams = event.params.querystring;
    var expressionAttributeValues = {};
    var filterExpressionArray = [];
    if (queryParams != null && queryParams.offerName != null) {
        expressionAttributeValues[":offerName"] = {
            S: queryParams.offerName
        }
        filterExpressionArray.push("contains(offerName,:offerName)");
    }
    if (queryParams != null && queryParams.offerDescription != null) {
        expressionAttributeValues[":offerDescription"] = {
            S: queryParams.offerDescription
        }
        filterExpressionArray.push("contains(offerDescription,:offerDescription)");
    }
    var filterExpression = filterExpressionArray.join(" and ");
    var params = {
        TableName: "offers"
    };
    if (filterExpression !== "") {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributeValues;
    }

    db.scan(params, function(err, data) {
        if (err) {
            console.log(err); // an error occurred
        } 
        else {
            context.done(null,data);
        }
    });
};