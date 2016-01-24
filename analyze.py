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



sq_exp <- function(x1, x2, kw = NULL, time = NULL) {
    if(is.null(kw)) {
        kw = rep(1, length(x1)) 
    } else if(length(kw) == 1) {
        kw = rep(kw, length(x1))
    }
    if(is.null(time)) {
        out <- exp(-sum((x1 - x2)^2 / (2 * kw)))
    } else {
        temp <- abs(x1 - x2)
        temp[time] <- ifelse(temp[time] > 12*3600, temp[time] - 12*3600, 
            temp[time])
        out <- exp(-sum(temp^2 / (2 * kw)))
    } 
    return(out)
}

kernel_mat <- function(X1, X2, kw = NULL, time = NULL) {
    n = nrow(X1)
    m = nrow(X2)
    out <- matrix(0, nrow = n, ncol = m)
    for(i in 1:n) { 
        for(j in 1:m) {
            out[i,j] <- sq_exp(X1[i,], X2[j,], kw = kw, time = time)
        }
    }
    return(out)
}

make_next_prediction <- function(dir, patient_number, is_post_meal = 0,
    is_pre_meal = 0) {
    require(Matrix)
    dat <- patient_mat(dir, patient_number)
    xhat <- as.matrix(
        data.frame(
            date_time = max(dat[,2]) + c(3600, 2 * 3600),
            time = (max(dat[,2]) + c(3600, 2* 3600)) %% 3600,
            post_meal = rep(is_post_meal, 2),
            pre_meal = rep(is_pre_meal, 2)))
    dat_kw <- apply(dat[,2:5], 2, sd) * 2500
    cols <- c(2:5)[dat_kw != 0]
    dat_kw <- dat_kw[dat_kw != 0]
    k_xx <- kernel_mat(dat[,cols], dat[,cols], kw = dat_kw, time = 2)
    k_xxs <- kernel_mat(dat[,cols], xhat[,cols-1], time = 2, kw = dat_kw)
    k_xsx <- kernel_mat(xhat[,cols-1], dat[,cols], time = 2, kw = dat_kw)
    k_xsxs <- kernel_mat(xhat[,cols-1], xhat[,cols-1], time = 2, kw = dat_kw)
    ign_idx <- round(apply(k_xsx, 2, sum), 20) == 0
    cov_fhat <- k_xsxs[1,1] - k_xsx[1,!ign_idx] %*% 
        solve(k_xx[!ign_idx,!ign_idx] + 10 * diag(sum(!ign_idx))) %*% 
        k_xxs[!ign_idx,1]
    fhat_mean <- k_xsx[1,!ign_idx] %*% solve(k_xx[!ign_idx,!ign_idx] + 
        0.01 * diag(sum(!ign_idx))) %*% dat[!ign_idx,1] # 0.01
    out <- c(lwr = fhat_mean - 2 * cov_fhat, 
        mu = fhat_mean, 
        upr = fhat_mean + 2 * cov_fhat)
    return(out)
}
    """

def get_prediction(patient):
    cwd = os.getcwd() + "/data"
    
    ml = SignatureTranslatedAnonymousPackage(rstring, "ml")
    
    pred = ml.make_next_prediction(cwd,patient,0,0)
    return jsonify({"lwr": pred[0], "mean": pred[1], "upr": pred[2]})
    # print ml.patient_mat(patient)

     # os.path.dirname(os.getcwd())

    # health_dict = json.loads(health_json)
    # for entry in health_dict.get('bloodGlucose'):
    #     date = entry.get('readingDate')
    #     fix_date(date)
