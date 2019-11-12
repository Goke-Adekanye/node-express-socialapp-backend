

//Error validators
const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

const isEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;

}

exports.validateSignupdata = (data) =>{

    let errors = {};
    //Email validation
    if (isEmpty(data.email)) {errors.email = 'Must not be empty'}
    if (!isEmail(data.email)) {errors.email = "Email must be valid"}
    //Password validation
    if (isEmpty(data.password)) {errors.password = 'Must not be empty'}
    if (data.password !== data.confirmPassword) { errors.password = 'Passwords must match'}
    //Handle validation
    if (isEmpty(data.handle)) {errors.handle = 'Must not be empty'}

    //if the above errors occur, output error
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLogindata = (data) =>{

    let errors = {};

    if (isEmpty(data.email)) errors.email = 'Must not be empty'
    if (!isEmail(data.email)) errors.email = 'Email must be valid'
    if (isEmpty(data.password)) errors.password = 'Must not be empty'
   
    //if the above errors occur, output error
    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

//validate reduced-user-details(ensures empty details are not sent to the database)
exports.reduceUserDetails = (data) => {
    let userDetails = {};
  
    //if bio != empty, remove white-space, set userDetail.bio = data.bio (typed-in bio)
    if (!isEmpty(data.bio.trim())) userDetails.bio = data.bio;
    //if website != empty and no white-space
    if (!isEmpty(data.website.trim())) {
      //adding http:// prefix to website updated
      // https://website.com
      if (data.website.trim().substring(0, 4) !== 'http') {
        userDetails.website = `http://${data.website.trim()}`;
      }
      //if website entered already has http://, just update 
      else userDetails.website = data.website;
    }
    //if location != empty, remove white-space, set userDetail.location = data.location (typed-in location)
    if (!isEmpty(data.location.trim())) userDetails.location = data.location;
  
    return userDetails;
  };