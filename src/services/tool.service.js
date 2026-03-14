require("dotenv").config();
async function handle(message){
    return " Tool service running for "+message;

}
module.exports = {handle};