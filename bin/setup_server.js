const fs = require("fs")
const util = require("util")
const path = require("path")
const inquirer = require("inquirer")
const exec = util.promisify(require("child_process").exec)

const logMessage = msg => console.log("\x1b[32m", msg, "\x1b[0m")
const ownPath = process.cwd()

const questions = [
    {
        type: "list",
        name: "appName",
        message: "Which app do you want to setup",
        choices: ["tmbweb", "tmbapi",],
        filter(val) {
            return val.toLowerCase()
        },
    },
    {
        type: "input",
        name: "domainName",
        message: "You have to provide domain name",
        default() {
            return "trademybots.com"
        }
    },
    {
        type: "input",
        name: "mongodbUrl",
        message: "Please provide MongoDB URI",
        default() {
            return "mongodb://localhost,localhost:27018,localhost:27019"
        }
    },
    {
        type: "list",
        name: "nodeEnv",
        message: "Which type of setup do you want?",
        choices: ["production", "development",],
        filter(val) {
            return val.toLowerCase()
        },
    },
    {
        type: "input",
        name: "razorpayWebhookSecret",
        message: "RazorPay Webook Secret",
        default() {
            return '';
        },
        when(answers) {
            return answer.appName === 'tmbapi'
        }
    },
    {
        type: "confirm",
        name: "db_support",
        message: "Enable Database Support",
        default() {
            return false
        }
    },
    {
        type: "list",
        name: "db_support_options",
        message: "Database support for?",
        choices: ["mongodb", "mysql", "sqlite"],
        filter(val) {
            return val.toLowerCase()
        },
        when(answers) {
            return answers.db_support
        }
    }
]

inquirer.prompt(questions).then(async (answers) => {

    switch(answer.appName) {
        case "tmbweb":
            answer.repo = "https://rakeshtembhurne@github.com/rakeshtembhurne/trademybots.git"
            answer.port = 8080

            break;
        case "tmbapi":
            answer.repo = "https://rakeshtembhurne@github.com/rakeshtembhurne/trademybots.git"
            answer.port = 5555

            break;
    }

    answer.branchName = 'develop';
    if (answer.nodeEnv === 'production') {
        answer.branchName = 'master';
    }

    // answers.appPath = path.join(ownPath, answers.appName)

    // await checkDirExist(answers.appPath)
    await setup(answers)

    console.log(
        "\x1b[32m",
        "The installation is done, this is ready to use !",
        "\x1b[0m"
    )

    console.log()

    console.log("\x1b[34m", "You can start by typing:")
    console.log(`    cd ${answers.appName}`)
    console.log("    npm start", "\x1b[0m")
    console.log()
    console.log(
        "\x1b[32m",
        "Check documentation (https://create-express-boilerplate.com) for more information",
        "\x1b[0m"
    )
    console.log()
})

async function runCmd(command) {
    try {
        const { stdout, stderr } = await exec(command)
        console.log("\x1b[33m", "Executing : " + command, "\x1b[0m")
    } catch (error) {
        console.log("\x1b[31m", error.message, "\x1b[0m")
    }
}

async function checkDirExist(appPath, folderName) {
    try {
        fs.mkdirSync(appPath)
    } catch (err) {
        if (err.code.toString() === "EEXIST") {
            console.log(
                "\x1b[31m",
                `The file ${folderName} already exist in the current directory, please give it another name.`,
                "\x1b[0m"
            )
        } else {
            console.log(err)
        }

        process.exit(1)
    }
}


async function setup(answers) {
    try {
        logMessage("Enabling aliases")
        await runCmd(`sed -i '/alias dir=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias grep=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias fgrep=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias egrep=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias ll=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias la=/s/^#//g' ~/.bashrc`)
        await runCmd(`sed -i '/alias l=/s/^#//g' ~/.bashrc`)

        logMessage("Updating OS")
        await runCmd(`sudo apt update --yes`)
        await runCmd(`sudo apt upgrade --yes`)

        logMessage("Cloning the project")
        await runCmd(`sudo mkdir /opt/bitnami/projects`)
        await runCmd(`sudo chown $USER /opt/bitnami/projects`)
        process.chdir(`/opt/bitnami/projects/`)
        await runCmd(`git clone --depth=1 ${answer.repo} ${answer.appName}`)

        logMessage("Installing dependencies")
        process.chdir(`/opt/bitnami/projects/${answer.appName}`)
        // TODO: should be main branch
        await runCmd(`git checkout develop`)
        await runCmd("npm install --silent")

        logMessage("Updating environment variables")
        await fs.copyFileSync("./.env.example", ".env")

        if (answer.appName === 'tmbweb') {
            await runCmd(`sed 's/BASE_URL=.*/BASE_URL=${answer.baseUrl}/' .env`)
            await runCmd(`sed 's/MONGODB_URI=.*/MONGODB_URI=${answer.mongodbUri}/' .env`)
            await runCmd(`sed 's/SITE_CONTACT_EMAIL=.*/SITE_CONTACT_EMAIL=${answer.siteContactEmail}/' .env`)
            await runCmd(`sed 's/SESSION_SECRET=.*/SESSION_SECRET=${answer.sessionSecret}/' .env`)
            await runCmd(`sed 's/GOOGLE_ID=.*/GOOGLE_ID=${answer.googleId}/' .env`)
            await runCmd(`sed 's/GOOGLE_SECRET=.*/GOOGLE_SECRET=${answer.googleSecret}/' .env`)

            await runCmd(`sed 's/SMTP_USER=.*/SMTP_USER=${answer.smtpUser}/' .env`)
            await runCmd(`sed 's/SMTP_PASSWORD=.*/SMTP_PASSWORD=${answer.smtpPassword}/' .env`)
            await runCmd(`sed 's/SMTP_HOST=.*/SMTP_HOST=${answer.smtpHost}/' .env`)
            await runCmd(`sed 's/SMTP_PORT=.*/SMTP_PORT=${answer.smtpPort}/' .env`)
            await runCmd(`sed 's/EMAIL_FROM=.*/EMAIL_FROM=${answer.emailFrom}/' .env`)

            await runCmd(`sed 's/RAZORPAY_API_KEY=.*/RAZORPAY_API_KEY=${answer.razorpayApiKey}/' .env`)
            await runCmd(`sed 's/RAZORPAY_API_SECRET=.*/RAZORPAY_API_SECRET=${answer.razorpayApiSecret}/' .env`)
            await runCmd(`sed 's/RAZORPAY_DEFAULT_PLAN=.*/RAZORPAY_DEFAULT_PLAN=${answer.razorpayApiSecret}/' .env`)

        } else if (answer.appName === 'tmbweb') {
            await runCmd(`sed 's/NODE_ENV=.*/NODE_ENV=${answer.nodeEnv}/' .env`)
            await runCmd(`sed 's/MONGO_URI=.*/MONGO_URI=${answer.mongodbUri}/' .env`)
            await runCmd(`sed 's/HOST=.*/HOST=${answer.host}/' .env`)
            await runCmd(`sed 's/PORT=.*/PORT=${answer.port}/' .env`)
            await runCmd(`sed 's/RAZORPAY_WEBHOOK_SECRET=.*/RAZORPAY_WEBHOOK_SECRET=${answer.razorpayWebhookSecret}/' .env`)
        }
            
        

        logMessage("Installing PM2")
        await runCmd("sudo npm install --global pm2")
        await runCmd("pm2 install pm2-logrotate")

        logMessage("Creating Virtual Host files")
        const vHost = `
<VirtualHost 127.0.0.1:80 _default_:80>
  ServerName ${answer.domainName}
  ServerAlias *
  DocumentRoot /opt/bitnami/projects/${answer.appName}
  <Directory "/opt/bitnami/projects/${answer.appName}">
    Options -Indexes +FollowSymLinks -MultiViews
    AllowOverride All
    Require all granted
  </Directory>
  ProxyPass / http://localhost:${answer.port}/
  ProxyPassReverse / http://localhost:${answer.port}/
</VirtualHost>
`;
        const vHostSsl = `
<VirtualHost 127.0.0.1:443 _default_:443>
    ServerName ${answer.domainName}
    ServerAlias *
    SSLEngine on
    SSLCertificateFile "/opt/bitnami/apache/conf/bitnami/certs/server.crt"
    SSLCertificateKeyFile "/opt/bitnami/apache/conf/bitnami/certs/server.key"
    DocumentRoot /opt/bitnami/projects/${answer.appName}
    <Directory "/opt/bitnami/projects/${answer.appName}">
        Options -Indexes +FollowSymLinks -MultiViews
        AllowOverride All
        Require all granted
    </Directory>
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/
</VirtualHost>
`;
        fs.writeFileSync('/opt/bitnami/apache/conf/vhosts/tmbweb-vhost.conf', vHost)
        fs.writeFileSync('/opt/bitnami/apache/conf/vhosts/tmbweb-https-vhost.conf', vHostSsl)

        logMessage("Restarting Apache")
        await runCmd("sudo /opt/bitnami/ctlscript.sh restart apache")

        logMessage("Installing Lego")
        process.chdir(`/tmp`)
        await runCmd(`curl -Ls https://api.github.com/repos/xenolf/lego/releases/latest | grep browser_download_url | grep linux_amd64 | cut -d '"' -f 4 | wget -i -`)
        await runCmd(`tar xf lego_v*.tar.gz`)
        await runCmd(`sudo mkdir -p /opt/bitnami/letsencrypt`)
        await runCmd(`sudo mv lego /opt/bitnami/letsencrypt/lego`)

        logMessage("Install SSL Certificate")
        await runCmd("sudo /opt/bitnami/ctlscript.sh stop")
        if (answer.appName === 'tmbweb') {
            await runCmd(`sudo /opt/bitnami/letsencrypt/lego --tls --email="${answer.lestEncryptEmail}" --domains="www.${answer.domainName}" --domains="${answer.domainName}" --path="/opt/bitnami/letsencrypt" run`)
        } else if (answer.appName === 'tmbapi') {
            await runCmd(`sudo /opt/bitnami/letsencrypt/lego --tls --email="${answer.lestEncryptEmail}" --domains="api.${answer.domainName}" --path="/opt/bitnami/letsencrypt" run`)
        }
        
        await runCmd(`sudo /opt/bitnami/ctlscript.sh start`)

        logMessage("Moving SSL Certificates for Apache")
        await runCmd("sudo mv /opt/bitnami/apache2/conf/bitnami/certs/server.crt /opt/bitnami/apache2/conf/bitnami/certs/server.crt.old")
        await runCmd("sudo mv /opt/bitnami/apache2/conf/bitnami/certs/server.key /opt/bitnami/apache2/conf/bitnami/certs/server.key.old")
        await runCmd("sudo ln -sf /opt/bitnami/letsencrypt/certificates/trademybots.com.key /opt/bitnami/apache2/conf/bitnami/certs/server.key")
        await runCmd("sudo ln -sf /opt/bitnami/letsencrypt/certificates/trademybots.com.crt /opt/bitnami/apache2/conf/bitnami/certs/server.crt")
        await runCmd("sudo chown root:root /opt/bitnami/apache2/conf/bitnami/certs/server*")
        await runCmd("sudo chmod 600 /opt/bitnami/apache2/conf/bitnami/certs/server*")

        logMessage("Restarting Apache")
        await runCmd("sudo /opt/bitnami/ctlscript.sh restart apache")

        
    } catch (error) {
        console.log(error)

        process.exit(1)
    }
}
