import json
from flask import jsonify
import dateutil.parser
import os
from rpy2.robjects.packages import SignatureTranslatedAnonymousPackage

rstring = """
patient_mat <- function(dir, patient_num) {
    # load required package -- ulimately needs fromJSON in the 
    # rjson package, but this wasn't working
    require(rjson)
    require(jsonlite)
    
    # file name of patient_num
    file_name <- paste0(dir, '/patient', patient_num, '.json')
    
    # load data as a list of data frames
    dat <- fromJSON(file_name)
    
    # separate list
    bg <- dat$bloodGlucose
    insulin <- dat$bolusInsulin
    food <- dat$food
        
    # format data   
    bg2 <- data.frame(
        date_time = strptime(bg$readingDate, '%y%y-%m-%dT%H:%M:%S'),
        time = numeric(nrow(bg)),
        glucose = bg$bgValue$value,
        post_meal = as.integer(bg$mealTag == 'MEAL_TAG_POST_MEAL'),
        pre_meal = as.integer(bg$mealTag == 'MEAL_TAG_PRE_MEAL')
    )
    bg2$time = as.integer(bg2$date_time) %% (24*3600)
    bg2$post_meal[is.na(bg2$post_meal)] = 0L
    bg2$pre_meal[is.na(bg2$pre_meal)] = 0L  
    insulin2 <- data.frame(
        date_time = strptime(insulin$readingDate, '%y%y-%m-%dT%H:%M:%S'),
        delivered = insulin$bolusDelivered$value)   
    food2 <- data.frame(
        date_time = strptime(food$readingDate, '%y%y-%m-%dT%H:%M:%S'),
        carbs = food$carbohydrates$value)
    
    
    # how far back do we want to look at insulin and food intake?
    lag <- 4 / 24 # four hour lag on insulin and food
    
    # create output
    out <- matrix(0, nrow = nrow(bg2), ncol = 7)
    out[,1] <- bg2$glucose
    out[,2] <- as.integer(bg2$date_time)
    out[,3] <- bg2$time  # do some sort of transformation
    out[,4] <- bg2$post_meal
    out[,5] <- bg2$pre_meal
    
    # return the matrix
    return(out)
}

pred_patient <- function(dir, patient_num, conf = 0.5) {
    require(forecast)
   
    dat <- patient_mat(dir, patient_num)
    y <- dat[,1]
    X <- dat[,2:5]
   
    t_new <- seq(min(X[,1]), max(X[,1]), length.out = nrow(X)*2)
    y_new <- numeric(2*nrow(X))
    y_new[1] <- y[1]
    for(i in 2:length(t_new)) {
        temp1 <- exp(-(t_new[i] - X[X[,1] <= t_new[i],1]) * 1e-3)
        temp2 <- y[X[,1] <= t_new[i]]
        y_new[i] <- sum(temp2 * temp1 / sum(temp1))
    }

    fit <- auto.arima(y_new)
    pred <- forecast(fit, 1, level = conf)

    n <- length(t_new)
    out <- c(
        time = round(2 * t_new[n] - t_new[n-1], 0),
        pred = pred$mean,
        upper = pred$upper,
        lower = pred$lower)
    return(out)
}
"""

def get_prediction(patient):
    cwd = os.getcwd() + "/data"
    
    ml = SignatureTranslatedAnonymousPackage(rstring, "ml")
    
    pred = ml.pred_patient(cwd,patient)
    return jsonify({"timestmp":pred[0], "mean": pred[1], "upr": pred[2], "lwr": pred[3]})
    # print ml.patient_mat(patient)

     # os.path.dirname(os.getcwd())

    # health_dict = json.loads(health_json)
    # for entry in health_dict.get('bloodGlucose'):
    #     date = entry.get('readingDate')
    #     fix_date(date)
