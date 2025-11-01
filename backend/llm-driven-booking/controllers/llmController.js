const { parseWithLLM } = require('../models/llmModel'); 



exports.postParse = async (req, res) => 
{
    try
    {
      const user_input = (req.body && req.body.utterance) || '';

      const intent = await parseWithLLM(user_input);

      console.log(intent.message);
      return res.status(200).json(intent);
    }
    catch(err)
    {
      //fix error message later
    return res.status(500).json({ error: "Internal Server Error" });
    }
}

exports.postConfirm = async(req, res) => 
{
    try
    {
      
    }
    catch(err)
    {
        //if we reach this point we've encountered a server error.

    }
}