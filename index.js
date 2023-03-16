import express from 'express'
import Queue from './queue.js'
import axios from 'axios'

const app = express()
const queueChatGPT = new Queue(1); // 最多同时执行 2 个任务
const queueWhisper = new Queue(1); // 最多同时执行 2 个任务


app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ extended: true, limit: "10mb" }))
app.use(express.json())

app.all("*", function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "DELETE,PUT,POST,GET,OPTIONS");
    if (req.method == 'OPTIONS')
        res.sendStatus(200);
    else
        next();
});

app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).send(err.message)
})


function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


app.post('/api/enqueue', async (req, res) => {
    const {
        body
    } = req
    if (body) {

        if (!body.httptype || (body.httptype !== 1 && body.httptype !== 2)) {
            res.status(400).send('httptype is missing in request');
            return
        }

        if (body.httptype === 2) {
            const arr2 = queueWhisper.getall()
            if (arr2.length > 50) {
                res.status(400).send('当前排队人数过多');
                return
            }
        }

        if (body.httptype === 1) {
            const arr1 = queueChatGPT.getall()
            if (arr1.length > 50) {
                res.status(400).send('当前排队人数过多');
                return
            }
        }

        const task = async () => {
            let response;
            try {
                const op = { ...body, headers: { 'Content-Type': 'application/json', ...body.headers }, data: typeof body.data === 'string' ? body.data : JSON.stringify(body.data) }
                console.log(`option ${JSON.stringify(op)}`)
                const res1 = await axios(op)
                response = { ...res1.data, status: 'done' }
            } catch (err) {
                response = {
                    result: err.message,
                    status: 'error'
                }
            }
            try {
                let resultTask;
                if (body.resultTask && response.status !== 'error') {
                    let op = {}
                    if (body.resultTask.isResult) {
                        let result = []
                        const regex = /-.*-/;
                        if (regex.test(response.response)) {
                            let rex = /^-/
                            result = response.response.split('\n').filter(i => {
                                const item = i.match(rex);
                                return i.length > 0 && item
                            })
                        } else {
                            result = response.response.split('\n')
                        }
                        op = { ...body.resultTask.data, content: result || [] }
                    }
                    const opt = { ...body.resultTask, headers: { 'Content-Type': 'application/json', ...body.resultTask.headers }, data: typeof body.data === 'string' ? op : JSON.stringify(op) }
                    console.log(`resultTask ${JSON.stringify(op)}`)
                    resultTask = await axios(opt)
                    response = { ...response, resultTask: resultTask.data }
                }
            } catch (err) {
                response = {
                    ...response, resultTask: {
                        result: err.message,
                        status: 'error'
                    }
                }
            }

            return response
        };
        const id = generateUUID()
        let result = ''
        if (body.httptype === 1) {
            result = queueChatGPT.enqueue(task, id);
        } else {
            result = queueWhisper.enqueue(task, id);
        }
        res.status(200).json({ ...result });
        // 将执行结果返回给调用方
        // res.status(200).json({ result });
    } else {
        res.status(400).send('param is missing in request');
    }
});

app.post('/api/getinfo', async (req, res) => {
    try {
        const {
            id, type
        } = req.body
        if (id && type && (type === 1 || type === 2)) {
            let result = '';
            if (type === 1) {
                result = queueChatGPT.getenqueue(id);
            } else {
                result = queueWhisper.getenqueue(id);
            }
            if (!result) throw new Error('not found task')
            res.status(200).json(result);

        } else {
            throw new Error('param is missing in request')
        }
    } catch (err) {
        res.status(400).json(err.message);
    }
});


app.get('/api/allinfo', async (req, res) => {
    try {
        const arr1 = queueChatGPT.getall()
        const arr2 = queueWhisper.getall()
        res.status(200).json({
            queueChatGPT: arr1,
            queueWhisper: arr2
        });
    } catch (err) {
        res.status(400).json(err.message);
    }
});

queueChatGPT.once('taskComplete', (taskid, result) => {
    console.log(`queueChatGPT taskComplete ${taskid} ${JSON.stringify(result)}`)
});

queueChatGPT.once('taskError', (taskid, error) => {
    console.log(`queueChatGPT taskError ${taskid} ${JSON.stringify(error)}`)


});

queueWhisper.once('taskComplete', (taskid, result) => {
    console.log(`queueWhisper taskComplete ${taskid} ${JSON.stringify(result)}`)
});

queueWhisper.once('taskError', (taskid, error) => {
    console.log(`queueWhisper taskError ${taskid} ${JSON.stringify(error)}`)
});


app.listen({ port: 3000 }, () => {
    console.log('Server started on port 3003');
});
