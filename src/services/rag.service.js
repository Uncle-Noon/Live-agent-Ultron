require("dotenv").config();
async function handle(message){
    return " RAG service running for "+message;

}
module.exports = {handle};