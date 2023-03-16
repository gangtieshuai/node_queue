import { EventEmitter } from 'events'

export default class Queue extends EventEmitter {
    constructor(concurrency = 1) {
        super();
        this.concurrency = concurrency;  // 同时进行的最大任务数
        this.tasks = [];  // 任务队列
        this.currentRunning = 0;  // 当前正在执行的任务数
        this.id = ''
        this.taskList = {}
    }

    getenqueue(id) {
        console.log(` TaskList `)
        Object.keys(this.taskList).map(i => {
            const el = this.taskList[i]
            console.log(`ID:${i} status:${el.status} number:${el.number}
        ${JSON.stringify(el.result)}
        `)
        })

        const op = this.taskList[id]
        if (!op) return false
        const taskarr = Object.keys(this.taskList)
        const list = taskarr.map(key => {
            const el = this.taskList[key]
            return {
                id: key,
                ...el
            }
        }).sort((a, b) => a.order - b.order)
        const idx = list.findIndex((i) => i.id === id)

        const num = list.filter((i, j) => {
            return j < idx && i.status === 'pendding'
        })

        return {
            ...this.taskList[id],
            number: num.length,
            id
        }

    }

    getall() {
        const arr = Object.keys(this.taskList).map(i => {
            const el = this.taskList[i]
            console.log(`ID:${i} status:${el.status} number:${el.number}
        ${JSON.stringify(el.result)}
        `)
            return { id: i, ...el }
        }).filter((el) => el.status === 'pendding')
        return arr
    }

    // 将任务添加到队列中
    enqueue(task, id) {
        this.tasks.push({ task, id });
        this.taskList[id] = {
            ...this.taskList[id],
            status: 'pendding',
            order: this.tasks.length
        }
        this.run();
        return this.getenqueue(id)
    }


    // 执行队列中的任务
    run() {
        // 如果正在执行的任务数已经达到最大并发数，则不再执行新的任务
        if (this.currentRunning >= this.concurrency) {
            return;
        }

        // 如果队列中没有待执行的任务，则直接返回
        if (this.tasks.length === 0) {
            return;
        }

        // 取出队列中的一个任务并执行
        const { task, id } = this.tasks.shift();
        this.currentRunning++;

        Promise.resolve(task())
            .then((result) => {
                this.currentRunning--;
                this.run();
                this.taskList[id] = {
                    ...this.taskList[id],
                    status: result.status || 'done',
                    result
                }
                this.emit('taskComplete', id, result);
            })
            .catch((error) => {
                this.currentRunning--;
                this.run();
                this.taskList[id] = {
                    ...this.taskList[id],
                    status: 'error',
                    result: error
                }
                this.emit('taskError', id, error);
            });
    }
}



