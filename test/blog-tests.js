'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');
const expect = chai.expect;

const { BlogPost } = require('../models');
const { closeServer, runServer, app } = require('../server');
const { TEST_DATABASE_URL } = require('../config');

chai.use(chaiHttp);

function destroyDB() {
    return new Promise((resolve, reject) => {
        mongoose.connection.dropDatabase()
            .then(result => resolve(result))
            .catch(err => reject(err));
    });
}

function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];
    for (let i = 1; i <= 10; i++) {
        seedData.push({
            author: {
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName()
            },
            title: faker.lorem.sentence(),
            content: faker.lorem.text()
        });
    }
    return BlogPost.insertMany(seedData);
}

describe('blog posts API resource', function () {
    before(function () {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function () {
        return seedBlogPostData();
    });

    afterEach(function () {
        return destroyDB();
    });

    after(function () {
        return closeServer();
    });

    describe('GET endpoint', function () {
        it('should return all existing posts', function () {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(_res => {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.lengthOf.at.least(1);
                    return BlogPost.count();
                })
                .then(count => {
                    expect(res.body).to.have.lengthOf(count);
                });
        });

        it('should return posts with right fields', function () {

            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function (res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('array');
                    expect(res.body).to.have.lengthOf.at.least(1);
                    res.body.forEach(function (post) {
                        expect(post).to.be.a('object');
                        expect(post).to.have.all.keys('id', 'title', 'content', 'author', 'created');
                    });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id);
                })
                .then(post => {
                    expect(resPost.title).to.eql(post.title);
                    expect(resPost.content).to.eql(post.content);
                    expect(resPost.author).to.eql(post.authorName);
                });
        });
    });
    describe('POST endpoint', function () {
        it('should add a new blog post', function () {

            const newPost = {
                title: faker.lorem.sentence(),
                author: {
                    firstName: faker.name.firstName(),
                    lastName: faker.name.lastName(),
                },
                content: faker.lorem.text()
            };
            return chai.request(app)
                .post('/posts')
                .send(newPost)
                .then(function (res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.a('object');
                    expect(res.body).to.have.all.keys(
                        'id', 'title', 'content', 'author', 'created');
                    expect(res.body.title).to.eql(newPost.title);

                    expect(res.body.id).to.not.be.null;
                    expect(res.body.author).to.eql(
                        `${newPost.author.firstName} ${newPost.author.lastName}`);
                    expect(res.body.content).to.eql(newPost.content);
                    return BlogPost.findById(expect(res.body.id));
                })
                .then(function (post) {
                    expect(post.title).to.eql(newPost.title);
                    expect(post.content).to.eql(newPost.content);
                    expect(post.author.firstName).to.eql(newPost.author.firstName);
                    expect(post.author.lastName).to.eql(newPost.author.lastName);
                });
        });
    });

    describe('PUT endpoint', function () {
        it('should update fields you send over', function () {
            const updateData = {
                title: 'cats cats cats',
                content: 'dogs dogs dogs',
                author: {
                    firstName: 'foo',
                    lastName: 'bar'
                }
            };

            return BlogPost
                .findOne()
                .then(post => {
                    updateData.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updateData);
                })
                .then(res => {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(updateData.id);
                })
                .then(post => {
                    expect(post.title).to.eql(updateData.title);
                    expect(post.content).to.eql(updateData.content);
                    expect(post.author.firstName).to.eql(updateData.author.firstName);
                    expect(post.author.lastName).to.eql(updateData.author.lastName);
                });
        });
    });

    describe('DELETE endpoint', function () {
        it('should delete a post by id', function () {
            let post;
            return BlogPost
                .findOne()
                .then(_post => {
                    post = _post;
                    return chai.request(app).delete(`/posts/${post.id}`);
                })
                .then(res => {
                    expect(res).to.have.status(204);
                    return BlogPost.findById(post.id);
                })
                .then(_post => {
                    expect(_post).to.be.null;

                });
        });
    });
});